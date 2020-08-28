import WebSocket from 'ws';
import {cryptoMap, getSignal, findFirst} from './db/index.mjs' ;
import {config} from "./db/firestore.mjs";
import {percent} from "./db/SignalClass.mjs";
import EventEmitter from 'events'



export const SYMBOL_TICK = 'SYMBOL_TICK'

class BinanceSocket extends EventEmitter {

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

        const {o: open, c: close, h: high} = data.close ? {c: data.close} : JSON.parse(data).k
        const signal = getSignal(symbol)
        signal.update({close, open, high})
        //console.log(cryptoMap,data.symbol)
        findFirst(cryptoMap)
    };

    updateSignal({data}) {
        data = JSON.parse(data)
        const {a: ask, b: bid} = data
        if (percent(ask, bid) < 1) {

            const symbol = data.s.toLowerCase()
            if (/btc$/.test(symbol)) {
                if (!this.candlesWebsocket[symbol]) {
                    const ws = this.candlesWebsocket[symbol] = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@kline_${config.timeframe || '1d'}`)
                    ws.onmessage = this.upsertSignal(symbol)
                    ws.onopen = () => setTimeout(() => ws.pong(noop), 3e3)
                } else {
                    this.upsertSignal(symbol)({data: {close: ask}})
                }
            }
            this.emit(this.getTickEvent(symbol), getSignal(symbol))
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

