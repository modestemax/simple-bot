import {promisify} from "util"
import redis from "redis"

const redisClient = global.redisClient = redis.createClient()
global.redisGetAsync = promisify(redisClient.get).bind(redisClient);
