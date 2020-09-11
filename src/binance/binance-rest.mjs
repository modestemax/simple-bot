import axios from 'axios';
import qs from 'qs'
import {config} from "../db/firestore.mjs";
import crypto from 'crypto'
import consola from 'consola'
import socketAPI from "./binance-socket.mjs";
import {addPercent} from "../utils.mjs";
import {logTrade, logApiError} from "../log.mjs";
import {cryptoMap} from "../db/index.mjs";
import WebSocket from "ws";

const BTC_ASSET_NAME = 'btc'

export class BinanceRest {
    #baseUrl = 'https://api.binance.com';
    #listenKey;
    auth;
    balances = {};
    #binanceInfo = {};
    bnbBalance;
    btcBalance;


    async init(auth) {
        consola.log('init binance rest api')
        this.auth = auth
        // await this.#cancelAllOpenOrders()
        await this.#getBinanceInfo()
        await this.#getBalances()
        await this.#cancelOCOOrders()
        await this.#sellAllAssets()
        await this.#initUserData()

        // await this.#buyAsset('eth')
        // await this.#sellAsset('eth')

        // await this.#sellSymbol('ethbtc')
    }

    get binanceInfo() {
        return this.#binanceInfo
    }

    get listenKey() {
        return this.#listenKey
    }

    async #createListenKey() {
        const info = await this.#secureAPI({method: 'post', uri: '/api/v3/userDataStream', sign: false})
        this.#listenKey = info.data.listenKey
        setTimeout(() => this.#pingListenKey(), 30 * 60 * 1e3)
        // setTimeout(() => this.#pingListenKey(), 6 * 1e3)
        return this.#listenKey
    }

    async #pingListenKey() {
        this.#listenKey && await this.#secureAPI({
            method: 'put',
            uri: '/api/v3/userDataStream',
            params: {listenKey: this.#listenKey},
            sign: false
        })
        return this.#listenKey
    }

    async #initUserData() {
        //https://github.com/binance-exchange/binance-official-api-docs/blob/master/user-data-stream.md
        const listenKey = await this.#createListenKey()
        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${listenKey}`)
        ws.onmessage = ({data}) => {
            data = JSON.parse(data)
            switch (data.e) {
                case 'listStatus':
                    break
                case 'executionReport':
                    break
                case 'balanceUpdate':
                    break
                case 'outboundAccountPosition':
                    data.B.forEach(({a: assetName, f: free, l: locked}) => {
                            if ((assetName + BTC_ASSET_NAME).toLowerCase() === 'btcbtc') {
                                this.btcBalance = +free
                            } else {
                                this.balances[assetName.toLowerCase()] && this.canTradeAsset(asset.a) && Object.assign(this.balances[assetName.toLowerCase()], {
                                    free: +free,
                                    locked: +locked
                                })
                            }
                        }
                    )
                    break
            }
            console.log(data)
        }
    }


    async #getBinanceInfo() {
        const info = await this.#publicAPI({method: 'get', uri: '/api/v3/exchangeInfo'})
        this.#binanceInfo = info.symbols.filter(s =>
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

    async #secureAPI({method, uri, params = {}, sign = true}) {
        try {
            consola.log(`api ${method} ${uri}`)
            const url = `${this.#baseUrl}${uri}`
            if (sign) {
                params.timestamp = Date.now()
                params.recvWindow = 3e3// * 20
                params.signature = this.#getHmacSignature(qs.stringify(params))
            }
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

            // consola.info('api result', res)
            return res;
        } catch (e) {
            logApiError(`\n${JSON.stringify(arguments)}\n${JSON.stringify(e?.response?.data)}\n`)
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

            // consola.info('api result', res)
            return res.data
        } catch (e) {
            consola.error(e)
            consola.error(e?.response?.data)
            consola.info(arguments)
            throw e
        }
    }


    // async sellMarketPrice({symbol, close, quantity}) {
    //     consola.log(`selling ${symbol} at market price`)
    //     return this.#postOrder({symbol, close, quantity, side: 'SELL'})
    //     // return this.#postOrder({symbol, quoteOrderQty, side: 'SELL'})
    // }

    async bid(symbol) {
        consola.log(`buying ${symbol} at market price`)
        return this.#postOrder({symbol, quoteOrderQty: this.btcBalance, side: 'BUY'})
    }

    ask({symbol, close}) {
        consola.log(`place OCO ${symbol}`)
        const assetName = this.getAssetName(symbol)
        let quantity = this.balances[assetName] && this.balances[assetName].free
        quantity = this.normalizeQuantity({symbol, quantity})
        return this.#postOrder({symbol, close, quantity, side: 'SELL'})
    }

    async #postOrder({symbol, close, price, stopPrice, side, type = "MARKET", quantity, quoteOrderQty}) {
        symbol = symbol.toUpperCase()
        consola.log(`${side} ${symbol} at market price`)
        let uri = '/api/v3/order'

        if (config.oco && close) {
            uri = '/api/v3/order/oco'
            type = void 0
            price = addPercent({close, percent: config.take_profit})
            stopPrice = addPercent({close, percent: -1 * config.stop_lost})
        }

        if (config.test) {
            uri = '/api/v3/order/test'
            quoteOrderQty = 1
            quantity = price = stopPrice = void 0
        }
        if (!(quantity || quoteOrderQty) || (quantity && quoteOrderQty)) {
            return
        }
        const res = await this.#secureAPI({
            method: 'post', uri, params: {
                symbol, side, type, quoteOrderQty, quantity, price, stopPrice
            }
        })
        // this.#getBalances()
        logTrade({side, symbol, cryptoMap})
        return res
    }

    canTradeSymbol(symbol) {
        if (this.#binanceInfo[symbol]) {
            if (!(/^(bnb|trx)/.test(symbol))) {
                return true
            }
        }
    }

    getSymbols() {
        return Object.keys(this.#binanceInfo).filter(symbol => this.canTradeSymbol(symbol))
    }

    canTradeAsset(assetName) {
        return this.canTradeSymbol(this.getSymbol(assetName))

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
        return this.#postOrder({symbol, quantity, side: 'SELL'})
    }


    normalizeQuantity({symbol, quantity}) {
        //https://github.com/binance-exchange/binance-official-api-docs/blob/master/rest-api.md#lot_size
        const {minQty, maxQty, stepSize} = this.binanceInfo[symbol]
        let qty
        if (quantity >= minQty && quantity <= maxQty) {
            if ((quantity - minQty) % stepSize === 0) {
                qty = quantity
            } else {
                qty = quantity - ((quantity - minQty) % stepSize)
            }
        }
        return +(qty || NaN).toFixed(8)
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
    get lockedAssets() {
        return Object.values(this.balances).filter(b => b.locked).map(b => b.asset)
    }

    async #cancelOCOOrders() {
        consola.log('canceling all open oco order')
        for (let assetName of this.lockedAssets) {
            await this.#secureAPI({
                method: 'delete',
                uri: '/api/v3/orderList',
                params: {symbol: this.getSymbol(assetName)}
            });
        }
    }

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
