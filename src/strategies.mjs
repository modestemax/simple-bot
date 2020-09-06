import consola from 'consola'
import {throttle} from "./utils.mjs";
import {first} from "./db/index.mjs";

const logFirst = (first) => consola.log('first', first?.symbol, first?.max, first?.percent)

const logFirstThrottle = throttle(logFirst, 30e3)
const firsts = {}

export function _first_({cryptoMap, emit}) {
    const sortedByPercent = Object.values(cryptoMap).filter(a => a.percent)
        .sort((a, b) => a.percent < b.percent ? 1 : -1)

    const [afirst] = sortedByPercent
    afirst.percent >= config.enter_trade && emit(afirst)
    log(afirst)
}


export function _pump_(cryptoMap, emit) {
    const sortedByPercent = Object.values(cryptoMap).filter(a => a.percent)
        .sort((a, b) => a.percent < b.percent ? 1 : -1)

    const firstList = sortedByPercent.filter(a => a.percent >= config.enter_trade && a.percent >= a.max)
    firstList.forEach(afirst => {
        emit(afirst)
        log(afirst)
    })
}

export default {_first_, _pump_}

function log(afirst) {
    if (afirst) {
        if (!firsts[afirst.symbol] || firsts[afirst.symbol] !== afirst.percent) {
            firsts[afirst.symbol] = afirst.percent
            logFirst(afirst)
        } else {
            logFirstThrottle(afirst)
        }
    }
}