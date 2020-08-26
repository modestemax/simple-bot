import WebSocket from 'ws';
import {cryptoMap, getSignal, findFirst} from './db/index.mjs' ;

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
    const symbol = data.s.toLowerCase()
    if (/btc$/.test(symbol)) {
        if (!candlesWebsocket[symbol]) {
            const ws = candlesWebsocket[symbol] = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@kline_1d`)
            ws.onmessage = upsertSignal(symbol)
        } else {
            upsertSignal(symbol)({data: {close: data.a}})
        }
    }
}

export function initTicker() {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!bookTicker')
    ws.onmessage = updateSignal
    ws.on('ping', (ping) => {
        debugger
    })
}

export function initTicker1() {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr')
    ws.onmessage = handleTicker
//w.close()
}

let tracking;

export function tickUniqSymbol({symbol, handler}) {
    tracking && tracking.close()
    tracking = trackSymbol({symbol, handler})
}

export function stopTickUniqSymbol() {
    try {
        tracking && tracking.close()
    } catch {

    }
}

function trackSymbol({symbol, handler}) {
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@miniTicker`)
    ws.onmessage = ({data}) => {
        const tick = JSON.parse(data)
        const crypto = getSignal(tick.s.toLowerCase())
        if (crypto) {
            crypto.close = +tick.c
            handler(crypto)
        }
    }
    return ws
}
