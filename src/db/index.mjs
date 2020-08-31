import {Signal,} from "./SignalClass.mjs";
import consola from 'consola'
import EventEmitter from 'events'
import {config} from "./firestore.mjs";

export const MAX_CHANGED = 'max-changed'

class MyEmitter extends EventEmitter {
}

export const dbEvent = new MyEmitter();

export const cryptoMap = {}


export const max = new Signal()
export const first = new Signal()

export const findFirst = (cryptoMap) => {
    const sortedByPercent = Object.values(cryptoMap).filter(a => a.percent).sort((a, b) => a.percent < b.percent ? 1 : -1)
    const sortedByMax = Object.values(cryptoMap).filter(a => a.max).sort((a, b) => a.max < b.max ? 1 : -1)

    const [newFirst] = sortedByPercent
    const [newMax] = sortedByMax
    if (newFirst) {
        if (newFirst.symbol !== first.symbol || first.percent !== newFirst.percent) {
            consola.log('first', newFirst.symbol, newFirst.max, newFirst.percent)
        }
        first.updateWith(newFirst)
    }
    if (newMax) {
        if (newMax.symbol !== max.symbol || max.max !== newMax.max) {
            consola.log('max', newMax.symbol, newMax.max)
        }
        max.updateWith(newMax)

        if (first.max >= max.max && first.percent >= config.enter_trade) {
            dbEvent.emit(MAX_CHANGED)
        }
    }
}

export function getSignal(symbol) {
    if (!cryptoMap[symbol]) {
        return cryptoMap[symbol] = new Signal({symbol})
    } else {
        return cryptoMap[symbol]
    }
}

