import {initTradingView} from './trading-view-data-loader.mjs'
import {initTick} from './binance-tick.mjs'
import {initFireStore} from './db/firestore.mjs'

initFireStore().then(config => {
    initTradingView(config)
    initTick(config)
})