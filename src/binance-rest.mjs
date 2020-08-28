import axios from 'axios';
import qs from 'qs'
import {config} from "./db/firestore.mjs";
import crypto from 'crypto'
import consola from 'consola'

const BTC_ASSET_NAME = 'btc'

export class BinanceRest {
    #baseUrl = 'https://api.binance.com';

    auth;
    balances = {};
    bnbBalance;
    btcBalance;


    async init(auth) {
        consola.log('init binance rest api')
        this.auth = auth
        // await this.#cancelAllOpenOrders()
        await this.#getBalances()
        await this.#sellAllAssets()

        // await this.#buyAsset('eth')
        // await this.#sellAsset('eth')

        // await this.#sellSymbol('ethbtc')
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

        this.balances = balances.filter(b => !/bnb|trx|btc/i.test(b.asset))
            .reduce((balance, asset) => ({...balance, [asset.asset]: asset}), {})
        this.btcBalance = balances.filter(b => /btc/i.test(b.asset))[0]?.free
        this.bnbBalance = balances.filter(b => /bnb/i.test(b.asset))[0]?.free

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


    async sellMarketPrice({symbol, quantity}) {
        consola.log(`selling ${symbol} at market price`)
        return this.#postOrder({symbol, quantity, side: 'SELL'})
    }

    async buyMarketPrice(symbol) {
        consola.log(`buying ${symbol} at market price`)
        return this.#postOrder({symbol, quoteOrderQty: this.btcBalance, side: 'BUY'})
    }

    async #postOrder({symbol, side, quantity, quoteOrderQty}) {
        symbol = symbol.toUpperCase()
        consola.log(`${side} ${symbol} at market price`)
        // const uri= '/api/v3/order/test'
        const uri = '/api/v3/order'
        const res = await this.#secureAPI({
            method: 'post', uri, params: {
                symbol, side, type: "MARKET", quoteOrderQty, quantity
            }
        })
        await this.#getBalances()
        return res
    }


    #cancelOrder(symbol) {
        return this.#secureAPI({method: 'delete', uri: '/api/v3/openOrders', params: {symbol}})
    }

    getSymbol(asset) {
        return (asset + BTC_ASSET_NAME)
    }

    getAssetName(symbol) {
        return symbol?.replace(/btc$/i,'')
    }

    #sellAsset(assetName) {
        consola.log(`selling ${assetName}`)
        const symbol = this.getSymbol(assetName)
        const quantity = this.balances[assetName] && this.balances[assetName].free
        return quantity && this.sellMarketPrice({symbol, quantity})
    }

    #sellSymbol(symbol) {
        consola.log(`selling ${symbol}`)
        const assetName = this.getAssetName(symbol)
        const quantity = this.balances[assetName] && this.balances[assetName].free
        return quantity && this.sellMarketPrice({symbol, quantity})
    }

    #buyAsset(assetName) {
        consola.log(`selling ${assetName}`)
        const symbol = this.getSymbol(assetName)
        return this.buyMarketPrice(symbol)
    }

    async #sellAllAssets() {
        consola.log('selling all assets')
        for (let asset in this.balances) {
            await this.#sellAsset(asset)
        }
    }


    async exchangeInfo() {
        const url = `${this.#baseUrl}/api/v3/exchangeInfo`
        return await axios.get(url);
    }
}

export const restAPI = new BinanceRest()