import {Signal,} from "./SignalClass.mjs";
import {config} from "./firestore.mjs";
import {SATOSHI} from "../utils.mjs";

export const cryptoMap = global.cryptoMap = {}

export function getSignal(symbol) {
    if (!cryptoMap[symbol]) {
        return cryptoMap[symbol] = new Signal({symbol})
    } else {
        return cryptoMap[symbol]
    }
}

export function hasGoodPrice(signal) {
    return signal.hasGoodPrice = (signal?.open >= config.min_good_price * SATOSHI)
}