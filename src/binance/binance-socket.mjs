import WebSocket from 'ws';
import {getSignal} from '../db/index.mjs' ;
import {config} from "../db/firestore.mjs";
import {percent} from "../db/SignalClass.mjs";
import {noop, ONE_MINUTE, SATOSHI} from "../utils.mjs";
import EventEmitter from 'events'


export default new class extends EventEmitter {

    get FINAL_EVENT() {
        return 'FINAL_EVENT'
    }

    get TRADE_EVENT() {
        return 'TRADE'
    }

    #max
    #first
    #restAPI
    #timeout = {max: null, first: null}

    init(restAPI) {
        this.#restAPI = restAPI
        this.initTicker()
    }

    getTickEvent(symbol) {
        return `${symbol}@trade`
    }

    initTicker() {
        const streams = [].concat(this.#restAPI.getSymbols().map(symbol => `${symbol}@kline_${config.timeframe || '1d'}/${this.getTickEvent(symbol)}`)).join('/')
        const ws = new WebSocket('wss://stream.binance.com:9443/stream?streams=' + streams)
        ws.onmessage = this.onStream
        ws.onopen = () => setTimeout(() => ws.pong(noop), ONE_MINUTE * 5)
    }

    onStream = ({data}) => {
        const {stream: tickEvent, data: sData} = JSON.parse(data)
        const symbol = tickEvent.split('@')[0]
        const signal = getSignal(symbol)
        const hasGoodPrice = this.hasGoodPrice(signal)
        if (this.getTickEvent(symbol) === tickEvent) {
            const {p: close} = sData
            if (hasGoodPrice) {
                // if (percent(ask, bid) < .35) {
                signal.update({close}) //set close to ask because we will buy to the best seller
                this.max = signal
                this.first = signal
                this.emit(tickEvent, signal)
            }
        } else {//@kline
            const {o: open, c: close, h: high, x: isFinal} = sData.k
            signal.update({close, open, high})
            if (isFinal && /ethbtc/i.test(symbol)) {
                this.emit(this.FINAL_EVENT)
            }
        }
        hasGoodPrice && this.checkIfReadyToTrade(signal)
    }

    hasGoodPrice(signal) {
        return signal?.open >= 350 * SATOSHI
    }

    checkIfReadyToTrade(signal) {
        if (config.strategy?.enter(signal)) {
            this.emit(this.TRADE_EVENT, signal)
        }
    }


    set max(signal) {
        if (!this.max?.max || this.max?.max < signal.max) {
            this.#max = signal
            this.logMax()
            clearInterval(this.#timeout.max)
            this.#timeout.max = setInterval(() => this.logMax(), ONE_MINUTE)
        }
    }

    get max() {
        return this.#max
    }

    set first(signal) {
        if (!this.first?.percent || this.first?.percent < signal.percent) {
            this.#first = signal
            this.logFirst()
            clearInterval(this.#timeout.first)
            this.#timeout.first = setInterval(() => this.logFirst(), ONE_MINUTE)
        }
    }

    get first() {
        return this.#first
    }

    logMax() {
        console.log('max', this.max?.symbol, this.max?.max)
    }

    logFirst() {
        console.log('first', this.first?.symbol, this.first?.max, this.first?.percent)
    }

}


