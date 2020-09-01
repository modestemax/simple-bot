import axios from 'axios';
import qs from 'qs'
import {config} from "./db/firestore.mjs";
import crypto from 'crypto'
import consola from 'consola'
import {socketAPI} from "./binance-socket.mjs";

const BTC_ASSET_NAME = 'btc'

export class BinanceRest {
    #baseUrl = 'https://api.binance.com';

    auth;
    balances = {};
    binanceInfo = {};
    bnbBalance;
    btcBalance;


    async init(auth) {
        consola.log('init binance rest api')
        this.auth = auth
        // await this.#cancelAllOpenOrders()
        await this.#binanceInfo()
        await this.#getBalances()
        await this.#sellAllAssets()

        // await this.#buyAsset('eth')
        // await this.#sellAsset('eth')

        // await this.#sellSymbol('ethbtc')
    }

    async #binanceInfo() {
        const info = await this.#publicAPI({method: 'get', uri: '/api/v3/exchangeInfo'})
        this.binanceInfo = info.symbols.filter(s =>
            /*s.baseAsset=='MBL' &&*/
            s.quoteAsset === 'BTC'
            && s.status === 'TRADING'
            && s.quoteOrderQtyMarketAllowed
            && s.isSpotTradingAllowed)
            .reduce((info, s) => {
                return {
                    ...info,
                    [s.symbol.toLowerCase()]: {
                        symbol: s.symbol.toLowerCase(),
                        assetName: s.baseAsset.toLowerCase(),
                        minQty: +s.filters[2].minQty,
                        maxQty: +s.filters[2].maxQty,
                        stepSize: +s.filters[2].stepSize,
                        minNotional: +s.filters[3].minNotional,
                    }
                }
            }, {})
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
            .filter(b => b.free > this.binanceInfo[this.getSymbol(b.asset)].minQty)
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
            params.recvWindow = 3e3// * 20
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
            consola.info(arguments)
            throw e
        }

    }

    async #publicAPI({method = 'get', uri}) {
        try {
            consola.log(`api ${method} ${uri}`)
            const url = `${this.#baseUrl}${uri}`
            let res = await axios[method](url)

            consola.info('api result', res)
            return res.data
        } catch (e) {
            consola.error(e)
            consola.error(e?.response?.data)
            consola.info(arguments)
            throw e
        }

    }


    async sellMarketPrice({symbol,/* quoteOrderQty,*/ quantity}) {
        consola.log(`selling ${symbol} at market price`)
        return this.#postOrder({symbol, quantity, side: 'SELL'})
        // return this.#postOrder({symbol, quoteOrderQty, side: 'SELL'})
    }

    async bid(symbol) {
        consola.log(`buying ${symbol} at market price`)
        return this.#postOrder({symbol, quoteOrderQty: this.btcBalance, side: 'BUY'})
    }

    // ask({symbol/*, quoteOrderQty*/}) {
    ask(symbol) {
        consola.log(`selling ${symbol}`)
        const assetName = this.getAssetName(symbol)
        // const quantity = this.balances[assetName] && this.balances[assetName].free
        // return quantity && this.sellMarketPrice({symbol, quoteOrderQty})
        return this.#sellAsset(assetName)
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


    getSymbol(assetName) {
        return (assetName + BTC_ASSET_NAME).toLowerCase()
    }

    getAssetName(symbol) {
        return symbol?.replace(/btc$/i, '')
    }


    async #sellAllAssets() {
        consola.log('selling all assets')
        for (let assetName in this.balances) {
            // this.#checkPriceThenSell(assetName)
            await this.#sellAsset(assetName)
        }
    }

    #sellAsset(assetName) {
        consola.log(`selling ${assetName}`)
        const symbol = this.getSymbol(assetName)
        let quantity = this.balances[assetName] && this.balances[assetName].free
        quantity = this.normalizeQuantity({symbol, quantity})
        return quantity && this.sellMarketPrice({symbol, quantity})
    }

    normalizeQuantity({symbol, quantity}) {
        //https://github.com/binance-exchange/binance-official-api-docs/blob/master/rest-api.md#lot_size
        const {minQty, maxQty, stepSize} = this.binanceInfo[symbol]
        if (quantity >= minQty && quantity <= maxQty) {
            if ((quantity - minQty) % stepSize === 0) {
                return quantity
            } else {
                return quantity - ((quantity - minQty) % stepSize)
            }
        }
    }

    async #checkPriceThenSell(assetName) {
        const symbol = this.getSymbol(assetName);
        const quantity = this.balances[assetName] && this.balances[assetName].free
        quantity && socketAPI.once(socketAPI.getTickEvent(symbol), ({open, close}) => {
            const quoteOrderQty = +(quantity * close).toFixed(8)
            if (quoteOrderQty > this.binanceInfo[symbol].minNotional) {
                this.#postOrder({symbol, quoteOrderQty, side: 'SELL'})
            }
        })
    }

//************************************************
//     async #cancelAllOpenOrders() {
//         consola.log('canceling all open order')
//         for (let openOrder of await this.#getOpenOrders()) {
//             await this.#cancelOrder(openOrder.symbol)
//         }
//     }
//
//     async #getOpenOrders() {
//         consola.log('loading open orders')
//         const orders = await this.#secureAPI({method: 'get', uri: '/api/v3/openOrders'});
//         return orders.data
//     }
//
//     #buyAsset(assetName) {
//         consola.log(`selling ${assetName}`)
//         const symbol = this.getSymbol(assetName)
//         return this.bid(symbol)
//     }
//

//
//
//     #cancelOrder(symbol) {
//         return this.#secureAPI({method: 'delete', uri: '/api/v3/openOrders', params: {symbol}})
//     }
}

export const restAPI = new BinanceRest()