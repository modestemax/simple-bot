import {Signal,} from "./SignalClass.mjs";
import consola from 'consola'
import EventEmitter from 'events'
import {config} from "./firestore.mjs";
import {throttle} from "../utils.mjs";
import firstStrategies from '../strategies.mjs'

export const MAX_CHANGED = 'max-changed'

class MyEmitter extends EventEmitter {
}

export const dbEvent = new MyEmitter();

export const cryptoMap = {}


export const max = new Signal()
export const first = new Signal()

const logMax = () => isFinite(max?.max) && consola.log('max', max?.symbol, max?.max)
const logMaxThrottle = throttle(logMax)


export const findFirst = () => {

    findTradablesThenSendThemToTrader()

    logSignal();
}


function findTradablesThenSendThemToTrader() {

    firstStrategies[config.strategy] && firstStrategies[config.strategy]({cryptoMap, emit});

    function emit(signals) {
        if (signals?.length) {
            // consola.info('emit',JSON.stringify( signals?.map(s => s.symbol)))
            // first.updateWith(afirst)
            dbEvent.emit(MAX_CHANGED, signals)
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


function logSignal() {
    const sortedByMax = Object.values(cryptoMap).filter(a => a.max).sort((a, b) => a.max < b.max ? 1 : -1)
    const [newMax] = sortedByMax
    const oldMax = Object.assign(new Signal(), max)
    max.updateWith(newMax)
    /*if (newFirst?.symbol !== oldFirst.symbol || oldFirst.percent !== oldFirst.percent) {
        logFirst()
    } else {
        logFirstThrottle()
    }*/

    if (newMax?.symbol !== oldMax.symbol || oldMax.max !== newMax?.max) {
        logMax()
    } else {
        logMaxThrottle()
    }
}
