import {initTradingView} from './trading-view-data-loader.mjs'
import {initTicker} from './binance-tick.mjs'
import {initFireStore} from './db/firestore.mjs'
import {initTrader} from "./trader.mjs";

import {initSocket} from './balance.mjs'

(async () => {
    try {

        await initFireStore()
        // await initTradingView()
        await initTicker()
        await initTrader()
        await initSocket()
    } catch {

    }
})()

//todo a miniut vendre tout

