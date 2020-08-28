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
        console.log('timeframe: ', config.timeframe)
        console.log('enter_trade: ', config.enter_trade)
        await restAPI.init(config.auth)
        socketAPI.init()
        await initTrader()
        // await initSocket()
    } catch (ex) {
        consola.error(ex)
    }
})()

//todo a miniut vendre tout

