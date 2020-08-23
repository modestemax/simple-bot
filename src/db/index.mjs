import {Signal,} from "./SignalClass.mjs";

import EventEmitter from 'events'

export const MAX_CHANGED = 'max-changed'

class MyEmitter extends EventEmitter {
}

export const dbEvent = new MyEmitter();


export const cryptoMap = {}

export const first = new Signal({})

export const findFirst = (cryptoMap) => {
    const sortedList = Object.values(cryptoMap).filter(a => a.percent).sort((a, b) => a.percent < b.percent ? 1 : -1)
    const [newFirst] = sortedList
    if (newFirst) {
        const max = first.max

        Object.assign(first, newFirst)

        console.log(first, 'percent=', first.percent, 'max=', first.max, 'min=', first.min)
        if (max !== first.max) {
            dbEvent.emit(MAX_CHANGED)
        }
    }
}

export function getSignal(symbol) {
    return cryptoMap[symbol]
}

