import {Signal,} from "./SignalClass.mjs";
import consola from 'consola'
import EventEmitter from 'events'
import {config} from "./firestore.mjs";
import {throttle} from "../utils.mjs";

export const MAX_CHANGED = 'max-changed'

class MyEmitter extends EventEmitter {
}

export const dbEvent = new MyEmitter();

export const cryptoMap = {}


export const max = new Signal()
export const first = new Signal()

const logMax = () => consola.log('max', max?.symbol, max?.max)
const logFirst = () => consola.log('first', first?.symbol, first?.max, first?.percent)

const logFirstThrottle = throttle(logFirst, 30e3)
const logMaxThrottle = throttle(logMax, 30e3)


export const findFirst = () => {
    const sortedByPercent = Object.values(cryptoMap).filter(a => a.percent).sort((a, b) => a.percent < b.percent ? 1 : -1)
    const sortedByMax = Object.values(cryptoMap).filter(a => a.max).sort((a, b) => a.max < b.max ? 1 : -1)

    const [newFirst] = sortedByPercent
    const [newMax] = sortedByMax
    const oldFirst = Object.assign(new Signal(), first)
    const oldMax = Object.assign(new Signal(), max)
    first.updateWith(newFirst)
    max.updateWith(newMax)

    findTradablesThenSendThemToTrader(sortedByPercent)

    logSignal({newFirst, oldFirst, newMax, oldMax});
}
const firsts = {}

function findTradablesThenSendThemToTrader(sortedByPercent) {
    const firstList = sortedByPercent.filter(a => a.percent >= config.enter_trade && a.percent >= a.max)
    firstList.forEach(first => {
        dbEvent.emit(MAX_CHANGED)
        if (!firsts[first.symbol] || firsts[first.symbol] !== first.percent) {
            firsts[first.symbol] = first.percent
            consola.info('MAX CHANGED', first.symbol, first.percent)
        }
    })
}

export function getSignal(symbol) {
    if (!cryptoMap[symbol]) {
        return cryptoMap[symbol] = new Signal({symbol})
    } else {
        return cryptoMap[symbol]
    }
}


function logSignal({newFirst, oldFirst, newMax, oldMax}) {
    if (newFirst?.symbol !== oldFirst.symbol || oldFirst.percent !== oldFirst.percent) {
        logFirst()
    } else {
        logFirstThrottle()
    }

    if (newMax?.symbol !== oldMax.symbol || oldMax.max !== newMax?.max) {
        logMax()
    } else {
        logMaxThrottle()
    }
}
