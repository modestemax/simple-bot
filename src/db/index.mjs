import {Signal,} from "./SignalClass.mjs";
import consola from 'consola'
import EventEmitter from 'events'
import {config} from "./firestore.mjs";
import {throttle} from "../utils.mjs";
import fs from 'fs'

export const MAX_CHANGED = 'max-changed'

class MyEmitter extends EventEmitter {
}

export const dbEvent = new MyEmitter();

export const cryptoMap = {}


export const max = new Signal()
export const first = new Signal()

const logMax = () => isFinite(max?.max) && consola.log('max', max?.symbol, max?.max)
const logFirst = () => consola.log('first', first?.symbol, first?.max, first?.percent)

const logFirstThrottle = throttle(logFirst, 30e3)
const logMaxThrottle = throttle(logMax, 30e3)


export const findFirst = () => {

    findTradablesThenSendThemToTrader()

    logSignal();
}
const firsts = {}

function findTradablesThenSendThemToTrader(/*sortedByPercent*/) {
    const sortedByPercent = Object.values(cryptoMap).filter(a => a.percent)
        .sort((a, b) => a.percent < b.percent ? 1 : -1)
    const firstList = sortedByPercent.filter(a => a.percent >= config.enter_trade && a.percent >= a.max)
    firstList.forEach(afirst => {
        first.updateWith(afirst)
        dbEvent.emit(MAX_CHANGED)
        if (!firsts[afirst.symbol] || firsts[afirst.symbol] !== afirst.percent) {
            firsts[afirst.symbol] = afirst.percent
            consola.info('MAX CHANGED', afirst.symbol, afirst.percent)
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

export function logTrade({side, symbol}) {
    const file = `~/${new Date().toDateString()}.txt`
    const stream = fs.createWriteStream(file, {flags: 'a'});
    const signal = cryptoMap[symbol.toLowerCase()]
    stream.write(`${side}\t${symbol}\t${signal.close}\t${signal.percent}%` + "\n");

}

export function logApiError(text) {
    const file = `~/${new Date().toDateString()}.txt`
    const stream = fs.createWriteStream(file, {flags: 'a'});
    stream.write(text + "\n");

}