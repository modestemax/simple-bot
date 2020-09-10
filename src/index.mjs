import cstamp from 'console-stamp'

// cstamp(consola, 'HH:MM:ss.l');
// cstamp(consola );

import {socketAPI} from './binance/binance-socket.mjs'
import {firestore} from './db/firestore.mjs'
import {initTrader} from "./trader.mjs";

// import {initSocket} from './_balance.mjs'
import {config} from "./db/firestore.mjs";
import {restAPI} from "./binance/binance-rest.mjs";
import consola from "consola";

(async () => {
    try {
        await firestore.initFireStore()
        await restAPI.init(config.auth)
        socketAPI.init(restAPI)
        initTrader()

        console.log('timeframe: ', config.timeframe)
        console.log('enter_trade: ', config.enter_trade)
        console.log('config: ', config)

    } catch (ex) {
        consola.error(ex)
        throw ex
    }
})()


