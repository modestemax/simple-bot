import axios from 'axios';
import qs from 'qs'
import {config} from "./db/firestore.mjs";
import crypto from 'crypto'

export class Binance {
    #baseUrl = 'https://api.binance.com';

    auth;
    balances = [];
    bnbBalance;
    btcBalance;

    async init(auth) {
        this.auth = auth
        await this.#cancelAllOpenOrders()
        await this.#getBalances()
        await this.#sellAllAssetsInMarketPrice()
    }

    getHmacSignature(queryString) {
        const secret = this.auth.secret;
        const hash = crypto.createHmac('sha256', secret)
            .update(queryString)
            .digest('hex');
        return hash;
    }

    async #getBalances() {
        const url = `${this.#baseUrl}/api/v3/account`
        const params = {timestamp: Date.now()}
        const signature = this.getHmacSignature(qs.stringify(params))
        const hasValue = b => +b.free + +b.locked
        const format = b => ({asset: b.asset.toLowerCase(), free: +b.free, locked: +b.locked})
        const res = await axios.get(url, {
            params: {...params, signature},
            headers: {'X-MBX-APIKEY': this.auth.api_key},

        })
        const balances = res.data.balances
            .filter(hasValue)
            .map(format)

        this.balances = balances.filter(b => !/bnb|btc/i.test(b.asset))
        this.btcBalance = balances.filter(b => /btc/i.test(b.asset))[0]
        this.bnbBalance = balances.filter(b => /bnb/i.test(b.asset))[0]

    }

    get currentTrade() {
        const balance = this.balances[0]
        if (balance) {
            return balance.asset + 'btc'
        }
    }

    get sellAllAssetsInMarketPrice() {
        const balance = this.balances[0]
        if (balance) {
            return balance.locked
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


    async sellMarketPrice(symbol) {
        await this.#secureAPI({
            method: 'post', uri: '/api/v3/open', params: {
                symbol,
                "type": "MARKET",
                "side": "SELL",
                quoteOrderQty: 1
            }
        })
    }

    async buyMarketPrice(symbol) {
        await this.#secureAPI({
            method: 'post', uri: '/api/v3/open', params: {
                symbol,
                "type": "MARKET",
                "side": "BUY",
                quoteOrderQty: this.btcBalance
            }
        })
    }

    async cancelOrder(symbol) {
        await this.#secureAPI({method: 'delete', uri: '/api/v3/openOrders', params: {symbol}})
    }

    async getOpenOrders() {
        const orders = await this.#secureAPI({method: 'get', uri: '/api/v3/openOrders'});
        return orders.data
    }

    async #cancelAllOpenOrders() {
        const orders = await this.getOpenOrders()
        for (let o of orders) {
            await this.cancelOrder(o.symbol)
        }
    }

    getSymbol(asset) {
        return (asset + 'btc').toLowerCase()
    }

    sellAsset(asset) {

    }

    async #sellAllAssets() {
        for (let b of this.balances) {
            await this.#sellAsset(this.getSymbol(b.asset))
        }
    }

    #secureAPI({method, uri, params, data}) {
        const url = `${this.#baseUrl}${uri}`
        params = params || {}
        params.timestamp = Date.now()
        params.recvWindow = 1e3
        params.signature = this.getHmacSignature(qs.stringify(params))
        return axios[method](url, {
            params: {...params},
            headers: {'X-MBX-APIKEY': this.auth.api_key},
        })
    }


    async exchangeInfo() {
        const url = `${this.#baseUrl}/api/v3/exchangeInfo`
        return await axios.get(url);
    }
}

export const api = new Binance()