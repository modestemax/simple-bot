import {cryptoMap} from "./db/index.mjs";


export function _first_(signal) {
    const sortedByPercent = Object.values(cryptoMap).filter(a => a.percent)
        .sort((a, b) => a.percent < b.percent ? 1 : -1)
    return (signal.symbol === sortedByPercent[0]?.symbol && signal.percent >= config.enter_trade)

}


export function _pump_(signal) {
    return signal.percent >= config.enter_trade && signal.percent >= signal.max
}

export default {_first_, _pump_}

