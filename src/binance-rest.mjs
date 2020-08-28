import axios from 'axios';
import qs from 'qs'
import {config} from "./db/firestore.mjs";
import crypto from 'crypto'
import consola from 'consola'
import Binance from 'binance-api-node'

const BTC_ASSET_NAME = 'btc'

export class BinanceRest {
    #baseUrl = 'https://api.binance.com';

    auth;
    balances = [];
    bnbBalance;
    btcBalance;

    async init1(auth) {
        const client = Binance.default({
            apiKey: auth.api_key,
            apiSecret: auth.secret,
            getTime: () => Date.now()
        })
        console.log(await client.ping())
        console.log(await client.orderTest({
            symbol: 'TRXBTC',
            side: 'SELL',
            type: 'MARKET',
            quantity: 1000
        }))
    }

    async init(auth) {
        consola.log('init binance rest api')
        this.auth = auth

        await this.#cancelAllOpenOrders()
        await this.#getBalances()
        await this.#sellAllAssets()
    }

    async #cancelAllOpenOrders() {
        consola.log('canceling all open order')
        for (let openOrder of await this.#getOpenOrders()) {
            await this.#cancelOrder(openOrder.symbol)
        }
    }

    async #getOpenOrders() {
        consola.log('loading open orders')
        const orders = await this.#secureAPI({method: 'get', uri: '/api/v3/openOrders'});
        return orders.data
    }

    async #getBalances() {
        consola.log('loading balances')
        const hasValue = b => +b.free + +b.locked
        const format = b => ({asset: b.asset.toLowerCase(), free: +b.free, locked: +b.locked})

        const res = await this.#secureAPI({method: 'get', uri: '/api/v3/account'})

        const balances = res.data.balances
            .filter(hasValue)
            .map(format)

        this.balances = balances.filter(b => !/bnb|btc/i.test(b.asset))
        this.btcBalance = balances.filter(b => /btc/i.test(b.asset))[0]
        this.bnbBalance = balances.filter(b => /bnb/i.test(b.asset))[0]

    }

    #getHmacSignature(queryString) {
        const secret = this.auth.secret;
        const hash = crypto.createHmac('sha256', secret)
            .update(queryString)
            .digest('hex');
        return hash;
    }

    async #secureAPI({method, uri, params = {}}) {
        try {
            consola.log(`api ${method} ${uri}`)
            const url = `${this.#baseUrl}${uri}`
            params.timestamp = Date.now()
            params.recvWindow = 3e3 * 20
            params.signature = this.#getHmacSignature(qs.stringify(params))
            let res
            switch (method) {
                case 'post':
                case 'put':
                    res = await axios[method](url, qs.stringify(params), {
                        headers: {
                            'X-MBX-APIKEY': this.auth.api_key,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                    })
                    break;
                default:
                    res = await axios[method](url, {
                        params,
                        headers: {
                            'X-MBX-APIKEY': this.auth.api_key,
                        },
                    })
            }

            consola.info('api result', res)
            return res;
        } catch (e) {
            consola.error(e)
            consola.error(e?.response?.data)
            throw e
        }

    }


    get currentTrade() {
        const balance = this.balances[0]
        if (balance) {
            return balance.asset + 'btc'
        }
    }


    get isCurrentTradeAsked() {
        const balance = this.balances[0]
        if (balance) {
            return balance.locked
        }
    }

    get currentTradeQuantity() {
        const balance = this.balances[0]
        if (balance) {
            return balance.free + balance.locked
        }
    }


    async #sellMarketPrice(symbol) {
        consola.log(`selling ${symbol} at market price`)
        return this.#postOrder({symbol, quoteOrderQty: 1, side: 'SELL'})
    }

    async #buyMarketPrice(symbol) {
        consola.log(`buying ${symbol} at market price`)
        return this.#postOrder({symbol, quoteOrderQty: this.btcBalance, side: 'BUY'})
    }

    #postOrder({symbol, side, quoteOrderQty}) {
        symbol = symbol.toUpperCase()
        consola.log(`${side} ${symbol} at market price`)
        return this.#secureAPI({
            method: 'post', uri: '/api/v3/order/test', params: {
                symbol, side, type: "MARKET", quoteOrderQty
            }
        })
    }


    #cancelOrder(symbol) {
        return this.#secureAPI({method: 'delete', uri: '/api/v3/openOrders', params: {symbol}})
    }

    getSymbol(asset) {
        return (asset + BTC_ASSET_NAME)
    }

    #sellAsset(assetName) {
        consola.log(`selling ${assetName}`)
        const symbol = this.getSymbol(assetName)
        return this.#sellMarketPrice(symbol)
    }

    async #sellAllAssets() {
        consola.log('selling all assets')
        for (let b of this.balances) {
            await this.#sellAsset(b.asset)
        }
    }


    async exchangeInfo() {
        const url = `${this.#baseUrl}/api/v3/exchangeInfo`
        return await axios.get(url);
    }
}

export const restAPI = new BinanceRest()