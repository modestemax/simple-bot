import {config} from "./db/firestore";

import Binance from 'binance-api-node'

const binance = Binance({apiKey: config.auth.api_key, apiSecret: config.auth.secret});

binance.ws.user(async msg => {
    switch (msg.eventType) {
        case "account":
            console.log(msg.balances)
                 // b =>     ({free: +b.available, used: +b.locked, total: +b.available + +b.locked});
            break;
    }
});