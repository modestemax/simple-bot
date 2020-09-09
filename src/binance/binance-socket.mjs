import WebSocket from 'ws';
import {getSignal, checkSymbolReadyToTrade} from '../db/index.mjs' ;
import {config} from "../db/firestore.mjs";
import {percent} from "../db/SignalClass.mjs";
import {noop, ONE_MINUTE, SATOSHI} from "../utils.mjs";
import EventEmitter from 'events'


export const SYMBOL_TICK = 'SYMBOL_TICK'

class BinanceSocket extends EventEmitter {

    get FINAL_EVENT() {
        return 'FINAL_EVENT'
    };

    #restAPI;
    candlesWebsocket = {};


    // constructor() {
    //     super()
    //     // this.updateSignal = this.updateSignal.bind(this)
    // }

    async init(restAPI) {
        this.#restAPI = restAPI
        await this.initTicker()
        //  await this.initUserData()
    }

    initTicker() {
        const streams = [].concat(this.#restAPI.getSymbols().map(symbol => `${symbol}@kline_${config.timeframe || '1d'}/${symbol}@bookTicker`)).join('/')
        const ws = new WebSocket('wss://stream.binance.com:9443/stream?streams=' + streams)
        ws.onmessage = this.onStream
        ws.onopen = () => setTimeout(() => ws.pong(noop), ONE_MINUTE * 5)
    }

    onStream = ({data}) => {
        const {stream, data: sData} = JSON.parse(data)
        const symbol = stream.split('@')[0]
        const signal = getSignal(symbol)
        const hasGoodPrice = this.hasGoodPrice(signal)
        if (/@bookTicker$/.test(stream)) {
            const {a: ask, b: bid} = sData
            if (hasGoodPrice) {
                // if (percent(ask, bid) < .35) {
                signal.update({close: ask})
                this.emit(stream, signal)
            }
        } else {//@kline
            const {o: open, c: close, h: high, x: isFinal} = sData.k
            signal.update({close, open, high})
            if (isFinal) {
                this.emit(this.FINAL_EVENT, symbol)
            }
        }
        hasGoodPrice && checkSymbolReadyToTrade()
    }

    hasGoodPrice(signal) {
        return signal?.open >= 200 * SATOSHI
    }

    // upsertSignal = (symbol) => ({data}) => {
    //     const {o: open, c: close, h: high, x: isFinal} = data.close ? {c: data.close} : JSON.parse(data).k
    //     const signal = getSignal(symbol)
    //     signal.update({close, open, high})
    //     findFirst()
    //     if (isFinal) {
    //         this.emit(this.FINAL_EVENT, symbol)
    //     }
    // };
    //
    // updateSignal({data}) {
    //     data = JSON.parse(data)
    //     const {a: ask, b: bid} = data
    //     if (percent(ask, bid) < .35) {
    //
    //         const symbol = data.s.toLowerCase()
    //         if (this.#restAPI.canTradeSymbol(symbol)) {
    //             if (!this.candlesWebsocket[symbol]) {
    //                 const ws = this.candlesWebsocket[symbol] = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@kline_${config.timeframe || '1d'}`)
    //                 ws.onmessage = this.upsertSignal(symbol)
    //                 ws.onopen = () => setTimeout(() => ws.pong(noop), ONE_MINUTE * 5)
    //             } else {
    //                 this.upsertSignal(symbol)({data: {close: ask}})
    //                 const signal = getSignal(symbol)
    //                 signal.close && this.emit(this.getTickEvent(symbol), signal)
    //             }
    //         }
    //     }
    // }


}

export const socketAPI = new BinanceSocket()


