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
    const oldFirst = Object.assign(new Signal(), first)
    const oldMax = Object.assign(new Signal(), max)
    first.updateWith(newFirst)
    max.updateWith(newMax)
    if (first.percent >= config.enter_trade) {
        // if (first.max >= max.max /*|| first.symbol !== max.symbol*/) {
        if (first.percent >= first.max /*|| first.symbol !== max.symbol*/) {
            dbEvent.emit(MAX_CHANGED)
            consola.info('MAX CHANGED', first.symbol, first.percent)
        }
    }

    if (newFirst?.symbol !== oldFirst.symbol || oldFirst.percent !== oldFirst.percent) {
        consola.log('first', newFirst?.symbol, newFirst?.max, newFirst?.percent)
    }

    if (newMax?.symbol !== oldMax.symbol || oldMax.max !== newMax?.max) {
        consola.log('max', newMax?.symbol, newMax?.max)
    }
}

export function getSignal(symbol) {
    if (!cryptoMap[symbol]) {
        return cryptoMap[symbol] = new Signal({symbol})
    } else {
        return cryptoMap[symbol]
    }
}

