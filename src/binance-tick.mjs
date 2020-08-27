import WebSocket from 'ws';
import {cryptoMap, getSignal, findFirst} from './db/index.mjs' ;
import {config} from "./db/firestore.mjs";
import {percent} from "./db/SignalClass.mjs";
import EventEmitter from 'events'

export const signal = new class SignalEvent extends EventEmitter {
}
const candlesWebsocket = {}
const upsertSignal = (symbol) => ({data}) => {

    const {o: open, c: close, h: high} = data.close ? {c: data.close} : JSON.parse(data).k
    const signal = getSignal(symbol)
    signal.update({close, open, high})
    //console.log(cryptoMap,data.symbol)
    findFirst(cryptoMap)
}

const updateSignal = ({data}) => {
    data = JSON.parse(data)
    const {a: ask, b: bid} = data
    if (percent(ask, bid) < 1) {

        const symbol = data.s.toLowerCase()
        if (/btc$/.test(symbol)) {
            if (!candlesWebsocket[symbol]) {
                const ws = candlesWebsocket[symbol] = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@kline_${config.timeframe || '1h'}`)
                ws.onmessage = upsertSignal(symbol)
                ws.onopen = () => setTimeout(() => ws.pong(noop), 3e3)

            } else {
                upsertSignal(symbol)({data: {close: ask}})
            }
        }
        signal.emit(symbol, getSignal(symbol))
    }
}

export function initTicker() {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!bookTicker')
    ws.onmessage = updateSignal
    ws.onopen = () => setTimeout(() => ws.pong(noop), 3e3)
}

function noop() {
// debugger
}

