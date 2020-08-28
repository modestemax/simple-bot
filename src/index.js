import {initTradingView} from './trading-view-data-loader.mjs'
import {binance} from './binance-tick.mjs'
import {firestore} from './db/firestore.mjs'
import {initTrader} from "./trader.mjs";

// import {initSocket} from './_balance.mjs'
import {config} from "./db/firestore.mjs";
import {api} from "./binance.mjs";
import consola from "consola";

(async () => {
    try {

        await firestore.initFireStore()
        await api.init(config.auth)
        console.log('timeframe: ', config.timeframe)
        const bal= await api.getOpenOrders()
        console.log('bal: ', await api.getBalances())
        // console.log('ping: ', await api.ping())

        binance.init()
        await initTrader()
        // await initSocket()
    } catch (ex) {
        consola.error(ex)
    }
})()

//todo a miniut vendre tout

