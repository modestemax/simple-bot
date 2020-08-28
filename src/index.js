import {initTradingView} from './trading-view-data-loader.mjs'
import {socketAPI} from './binance-socket.mjs'
import {firestore} from './db/firestore.mjs'
import {initTrader} from "./trader.mjs";

// import {initSocket} from './_balance.mjs'
import {config} from "./db/firestore.mjs";
import {restAPI} from "./binance-rest.mjs";
import consola from "consola";

(async () => {
    try {

        await firestore.initFireStore()
        await restAPI.init(config.auth)
        console.log('timeframe: ', config.timeframe)
        const bal= await restAPI.getOpenOrders()
        console.log('bal: ', await restAPI.getBalances())
        // console.log('ping: ', await api.ping())

        socketAPI.init()
        await initTrader()
        // await initSocket()
    } catch (ex) {
        consola.error(ex)
    }
})()

//todo a miniut vendre tout

