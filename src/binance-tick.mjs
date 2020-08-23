import WebSocket from 'ws';
import {cryptoMap, getSignal, findFirst} from './db/index.mjs' ;

const handleTicker = ({data}) => {
    if (cryptoMap) {
        JSON.parse(data).map(tick => {
            const crypto = getSignal(tick.s.toLowerCase())
            if (crypto) {
                crypto.close = +tick.c
            }
        })
        // console.log(cryptoMap)
        findFirst(cryptoMap)
    }
}


export function initTicker() {
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
    tracking && tracking.close()
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
