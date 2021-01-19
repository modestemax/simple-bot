import {Signal,} from "./SignalClass.mjs";

export const cryptoMap =global.cryptoMap= {}

export function getSignal(symbol) {
    if (!cryptoMap[symbol]) {
        return cryptoMap[symbol] = new Signal({symbol})
    } else {
        return cryptoMap[symbol]
    }
}

