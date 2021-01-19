import {promisify} from "util"
import redis from "redis"

const redisClient = global.redisClient = redis.createClient()
global.redisGetAsync = promisify(redisClient.get).bind(redisClient);

global.processExit = (code) => /max/.test(process.env.HOME) || process.exit(code)
global.yesterdaySymbols = JSON.parse(await redisGetAsync('symbols'))?.reduce((symbols, symbol) => ({
    ...symbols,
    [symbol.toLowerCase()]: true
}), {})
