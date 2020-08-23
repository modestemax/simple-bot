import {initTradingView} from './trading-view-data-loader.mjs'
import {initTicker} from './binance-tick.mjs'
import {initFireStore} from './db/firestore.mjs'
import {initTrader} from "./trader.mjs";

(async () => {
    await initFireStore()
    await initTradingView()
    await initTicker()
    await initTrader()
})()