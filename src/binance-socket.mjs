import WebSocket from 'ws';
import {cryptoMap, getSignal, findFirst} from './db/index.mjs' ;
import {config} from "./db/firestore.mjs";
import {percent} from "./db/SignalClass.mjs";
import EventEmitter from 'events'


export const SYMBOL_TICK = 'SYMBOL_TICK'

class BinanceSocket extends EventEmitter {

    get FINAL_EVENT() {
        return 'FINAL_EVENT'
    };

    candlesWebsocket = {};


    constructor() {
        super()
        this.updateSignal = this.updateSignal.bind(this)
    }

    init() {
        // super()
        const ws = new WebSocket('wss://stream.binance.com:9443/ws/!bookTicker')
        ws.onmessage = this.updateSignal
        ws.onopen = () => setTimeout(() => ws.pong(noop), 3e3)
    }


    upsertSignal = (symbol) => ({data}) => {
        const {o: open, c: close, h: high, x: isFinal} = data.close ? {c: data.close} : JSON.parse(data).k
        const signal = getSignal(symbol)
        signal.update({close, open, high})
        findFirst(cryptoMap)
        if (isFinal) {
            this.emit(this.FINAL_EVENT, symbol)
        }
    };

    updateSignal({data}) {
        data = JSON.parse(data)
        const {a: ask, b: bid} = data
        if (percent(ask, bid) < .35) {

            const symbol = data.s.toLowerCase()
            if (/btc$/.test(symbol)) {
                if (!this.candlesWebsocket[symbol]) {
                    const ws = this.candlesWebsocket[symbol] = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@kline_${config.timeframe || '1d'}`)
                    ws.onmessage = this.upsertSignal(symbol)
                    ws.onopen = () => setTimeout(() => ws.pong(noop), 3e3)
                } else {
                    this.upsertSignal(symbol)({data: {close: ask}})
                    const signal = getSignal(symbol)
                    signal.close && this.emit(this.getTickEvent(symbol), signal)
                }
            }
        }
    }

    getTickEvent(symbol) {
        return symbol + SYMBOL_TICK
    }
}

export const socketAPI = new BinanceSocket()

function noop() {
// debugger
}

