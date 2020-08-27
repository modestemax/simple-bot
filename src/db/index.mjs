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
    const sortedPercentList = Object.values(cryptoMap).filter(a => a.percent).sort((a, b) => a.percent < b.percent ? 1 : -1)
    const sortedMaxList = Object.values(cryptoMap).filter(a => a.max).sort((a, b) => a.max < b.max ? 1 : -1)

    const [newFirst] = sortedPercentList
    if (newFirst) {
        if (newFirst.symbol !== first.symbol || first.percent !== newFirst.percent) {
            consola.log('first', newFirst.symbol, newFirst.percent)
        }
        Object.assign(first, newFirst)

        if (first.max >= max.max && first.max >= config.enter_trade) {
            dbEvent.emit(MAX_CHANGED)
            // saveFirst(first)
        }
    }
    if (max.max < sortedMaxList[0].max) {
        Object.assign(max, sortedMaxList[0])
        consola.log('max', max.symbol, max.max)
    }
}

export function getSignal(symbol) {
    if (!cryptoMap[symbol]) {
        return cryptoMap[symbol] = new Signal({symbol})
    } else {
        return cryptoMap[symbol]
    }
}

