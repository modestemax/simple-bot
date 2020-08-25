import {Signal,} from "./SignalClass.mjs";
import consola from 'consola'
import EventEmitter from 'events'
import {config, saveFirst} from "./firestore.mjs";

export const MAX_CHANGED = 'max-changed'

class MyEmitter extends EventEmitter {
}

export const dbEvent = new MyEmitter();


export const cryptoMap = {}
let dayMax = config.first.max || config.enter_trade
export const first = new Signal(Object.assign({}, config.first))
export const findFirst = (cryptoMap) => {
    const sortedList = Object.values(cryptoMap).filter(a => a.percent).sort((a, b) => a.percent < b.percent ? 1 : -1)
    const [newFirst] = sortedList
    if (newFirst) {
        if (newFirst.symbol !== first.symbol || first.percent !== newFirst.percent) {
            consola.log(newFirst)
        }
        Object.assign(first, newFirst)

        if (first.max > dayMax && first.max >= config.enter_trade) {
            dbEvent.emit(MAX_CHANGED)
            dayMax = first.max
            saveFirst(first)
        }
    }
}

export function getSignal(symbol) {
    return cryptoMap[symbol]
}

