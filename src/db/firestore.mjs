import Firestore from '@google-cloud/firestore'

export const config = {
    enter_trade: 25,
    stop_lost: 3,
    take_profit: 2,
    acceptable_loss_on_gain_percentage: 50,
    current_trade: {},//object
    first: {},//object
    acceptable_gap_between_first_and_second: 3
}
const date = new Date()
const db = new Firestore({ignoreUndefinedProperties: true});
const CURRENT_TRADE_ID = 'current_trade_' + date.toDateString()
const FIRST_ID = 'first_' + date.toDateString()
const PREVIOUS_TRADES_ID = 'previous_trades_' + date.toDateString()

const configRef = db.collection('bot').doc('config');
const currentTradeRef = db.collection('bot').doc(CURRENT_TRADE_ID);
const firstRef = db.collection('bot').doc(FIRST_ID);

class Firestore2 {
    async initFireStore() {
        const [configData, currentTradeData, firstData] = await Promise.all([configRef.get(), currentTradeRef.get(), firstRef.get()])
        if (!configData.data().enter_trade) {
            await configRef.set(Object.assign({}, config, {current_trade: void 0}))
        } else {
            Object.assign(config, configData.data());
        }
        config.current_trade = currentTradeData.data()
        config.first = firstData.data()
        return config
    }

    async saveCurrentTrade(trade) {
        if (!config.current_trade) {
            return save()
        }
        if (config.current_trade.symbol !== trade.symbol) {
            return save()
        }
        // if (Math.abs(config.current_trade.percent - trade.percent) > .25) {
        save()

        // }

        function save() {
            config.current_trade = trade
            currentTradeRef.set(Object.assign({}, trade)).catch(noop);
        }
    }

//
// export function saveFirst(first) {
//     config.first = first
//     firstRef.set(Object.assign({}, first)).catch(noop);
// }

    async savePreviousTrade(trade) {

        const previousTradeRef = db.collection('bot').doc(PREVIOUS_TRADES_ID);
        let previousTrades = (await previousTradeRef.get()).data()
        previousTrades = previousTrades && previousTrades.trades ? previousTrades.trades : []
        previousTrades = [trade, ...previousTrades,]
        previousTradeRef.set({trades: previousTrades.map(o => Object.assign({}, o))}).catch(noop);
    }

    async saveGrandMin(symbol, value) {

        const minRef = db.collection('bot').doc('min');
        let min = (await minRef.get()).data()
        min = min || {}

        min[symbol] = min[symbol] || []
        min[symbol] = [...min[symbol], value].sort()
        minRef.set(min).catch(noop);
    }
}

function noop() {
}

export const firestore = new Firestore2()