import {promisify} from "util"
import redis from "redis"

import NRP from "node-redis-pubsub";

const redisClient = global.redisClient = redis.createClient()
global.redisGetAsync = promisify(redisClient.get).bind(redisClient);

const config = {
    emitter: redis.createClient(),                      // Pass in an existing redis connection that should be used for pub
    receiver: redis.createClient(),                     // Pass in an existing redis connection that should be used for sub
}

const nrp = new NRP(config); // This is the NRP client
nrp.on('buy*', function (token) {
    console.log('force buy ' + token);
    token.split(/\W/).forEach(token => {
        const signal = cryptoMap[token + 'btc']
        if (signal) {
            signal.forceBuy = true
        }
    })
});
nrp.on('sell*', function (token) {
    console.log('force sell ' + token);
    token.split(/\W/).forEach(token => {
        const signal = cryptoMap[token + 'btc']
        if (signal) {
            signal.forceSell = true
        }
    })
});

global.processExit = (code) => /max/.test(process.env.HOME) || process.exit(code)
global.yesterdaySymbols = JSON.parse(await redisGetAsync('symbols'))?.reduce((symbols, symbol) => ({
    ...symbols,
    [symbol.toLowerCase()]: true
}), {})
