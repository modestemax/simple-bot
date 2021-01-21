import cstamp from 'console-stamp'

// cstamp(consola, 'HH:MM:ss.l');
// cstamp(consola );
import "./global.mjs"
import socketAPI from './binance/binance-socket.mjs'
import firestore from './db/firestore.mjs'
import trader from "./trader.mjs";

// import {initSocket} from './_balance.mjs'
import {config} from "./db/firestore.mjs";
import {restAPI} from "./binance/binance-rest.mjs";
//import consola from "consola";
import {logError} from "./log.mjs";
import sendgrid from './email.mjs'
import sendMessage from './telegram.mjs'
import {ONE_SECOND} from "./utils.mjs";


(async () => {
    try {
        await firestore.initFireStore()
        await restAPI.init(config.auth)
        socketAPI.init(restAPI)
        trader.init()
        sendgrid.send({body: "Bot Started :" + config.instance_name})
        sendMessage("Bot Started :" + config.instance_name)

        console.log('timeframe: ', config.timeframe)
        console.log('enter_trade: ', config.enter_trade)
        console.log('config: ', config)

    } catch (ex) {
        console.error(ex)
        throw ex
    }
})()


process.on('uncaughtException', function (err) {
    err = new Error(err)
    logError((new Date).toUTCString() + ' uncaughtException:', err.message)
    logError(err.stack)
    processExit(1)
})

process.on('unhandledRejection', (reason, promise) => {
    reason = new Error(reason)
    logError('Unhandled Rejection ' + reason.message + '\n' + reason.stack);
    // Application specific logging, throwing an error, or other logic here
});

//setInterval(() => process.exit(), 15 * 60 * ONE_SECOND);