import Firestore from '@google-cloud/firestore'
import {noop} from "../utils.mjs";
import strategies from "../strategies/index.mjs";

export const config = {
    enter_trade: 25,
    timeframe: '1d',
    strategy: '_first_',
    stop_lost: 3,
    min_pick: 2,
    symbol_max_loss: 2,
    stop_on_profit: true,
    oco: false,
    test: true,
    trailing_stop_loss: true,
    take_profit: 2,
    acceptable_loss_on_gain_percentage: 50,
    trade_max_time_minute: 30,
    acceptable_gap_between_first_and_second: 3
}
// const date = new Date()
const db = new Firestore({ignoreUndefinedProperties: true});
// const CURRENT_TRADE_ID = 'current_trade_' + date.toDateString()
// const FIRST_ID = 'first_' + date.toDateString()
// const PREVIOUS_TRADES_ID = 'previous_trades_' + date.toDateString()

const configRef = db.collection('bot').doc('config');
// const currentTradeRef = db.collection('bot').doc(CURRENT_TRADE_ID);
// const firstRef = db.collection('bot').doc(FIRST_ID);
const pt = 'z_t_t_'
const ts = 'z_t_sd_'
const lc = 'z_t_lc_'
const logsCollection='logs'
const dateString =' '+ new Date().toISOString().split('T')[0] + ' ' + new Date().toDateString().split(' ')[0]

export default new class {

    async initFireStore() {
        const [configData/*, currentTradeData, firstData*/] = await Promise.all([configRef.get()/*, currentTradeRef.get(), firstRef.get()*/])
        if (!configData.data().enter_trade) {
            await configRef.set(Object.assign({}, config,))
        } else {
            Object.assign(config, configData.data());
        }
        // config.current_trade = currentTradeData.data()
        // config.first = firstData.data()
        config.instance_name = process.env.TIME_FRAME || config.timeframe

        const [timeframe, name] = (config.instance_name).split('_')
        const instanceConfig = Object.assign({}, config[timeframe], config[name], config[process.env.TIME_FRAME])
        Object.assign(config, instanceConfig, {timeframe: config[timeframe] && timeframe})
        strategies[config.strategy] && (config.strategy = Object.assign(strategies[config.strategy], {name: config.strategy}))

        if (!config.strategy?.enter) {
            console.error('no strategy, exit')
            process.exit(5)
        }
        config.strategy.gotProfit = await this.#getProfitTag()
        config.strategy.tradeStarted = await this.#getTradeStarted()
        config.strategy.lostCount = await this.#getLossCount()
        global.config = config
        return config
    }

//     async saveCurrentTrade(trade) {
//         if (config.current_trade?.symbol !== trade?.symbol) {
//             return save()
//         }
//         // if (Math.abs(config.current_trade.percent - trade.percent) > .25) {
//         return save()
//
//         // }
//
//         async function save() {
//             config.current_trade = trade
//             trade && await currentTradeRef.set(Object.assign({}, trade)).catch(noop);
//         }
//     }
//
// //
    setProfitTag(first) {
        const tagRef = db.collection(logsCollection).doc(pt + config.instance_name + dateString);
        tagRef.set(Object.assign({}, first)).catch(noop);
    }

    saveLossCount(lostCount) {
        const tagRef = db.collection(logsCollection).doc(lc + config.instance_name + dateString);
        tagRef.set(Object.assign({}, lostCount)).catch(noop);
    }

    setTradeStarted(first) {
        const tagRef = db.collection(logsCollection).doc(ts + config.instance_name + dateString);
        tagRef.set(Object.assign({}, first)).catch(noop);
    }


    async #getProfitTag() {
        const tagRef = db.collection(logsCollection).doc(pt + config.instance_name + dateString);
        return (await tagRef.get()).data();
    }

    async #getLossCount() {
        const tagRef = db.collection(logsCollection).doc(lc + config.instance_name + dateString);
        return (await tagRef.get()).data() || {};
    }

    async #getTradeStarted() {
        const tagRef = db.collection(logsCollection).doc(ts + config.instance_name + dateString);
        return (await tagRef.get()).data();
    }

//
//     async savePreviousTrade(trade) {
//
//         const previousTradeRef = db.collection('bot').doc(PREVIOUS_TRADES_ID);
//         let previousTrades = (await previousTradeRef.get()).data()
//         previousTrades = previousTrades && previousTrades.trades ? previousTrades.trades : []
//         previousTrades = [trade, ...previousTrades,]
//         previousTradeRef.set({trades: previousTrades.map(o => Object.assign({}, o))}).catch(noop);
//     }
//
//     async saveGrandMin(symbol, value) {
//
//         const minRef = db.collection('bot').doc('min');
//         let min = (await minRef.get()).data()
//         min = min || {}
//
//         min[symbol] = min[symbol] || []
//         min[symbol] = [...min[symbol], value].sort()
//         minRef.set(min).catch(noop);
//     }
}

