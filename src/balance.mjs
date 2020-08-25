import {config} from "./db/firestore.mjs";

import Binance from 'binance-api-node'


export function initSocket() {
    // const binance = Binance({apiKey: config.auth.api_key, apiSecret: config.auth.secret});
    const binance = Binance();


    binance.ws.user(async msg => {
        switch (msg.eventType) {
            case "account":
                console.log(msg.balances)
                // b =>     ({free: +b.available, used: +b.locked, total: +b.available + +b.locked});
                break;
        }
    });

    binance.ws.candles('ETHBTC', '1m', candle => {
        console.log(candle)
    })
}