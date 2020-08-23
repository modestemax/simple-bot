import Firestore from '@google-cloud/firestore'

export const config = {
    enter_trade: 10,
    stop_lost: 3,
    take_profit: 2,
    acceptable_loss_on_gain_percentage: 50,
    current_trade: {},//object
    acceptable_gap_between_first_and_second: 3
}
const date = new Date()
const db = new Firestore({ignoreUndefinedProperties: true});
const CURRENT_TRADE_ID = 'current_trade_' + date.toDateString()
const PREVIOUS_TRADES_ID = 'previous_trades_' + date.toDateString()

const configRef = db.collection('bot').doc('config');
const currentTradeRef = db.collection('bot').doc(CURRENT_TRADE_ID);

export async function initFireStore() {
    const [configData, currentTradeData] = await Promise.all([configRef.get(), currentTradeRef.get()])
    if (!configData.data().enter_trade) {
        await configRef.set(Object.assign({}, config, {current_trade: void 0}))
    } else {
        Object.assign(config, configData.data());
    }
    config.current_trade = currentTradeData.data()
    return config
}

export function saveCurrentTrade(trade) {
    config.current_trade = trade
    currentTradeRef.set(Object.assign({}, trade));
}

export async function savePreviousTrade(trade) {

    const previousTradeRef = db.collection('bot').doc(PREVIOUS_TRADES_ID);
    let previousTrades = (await previousTradeRef.get()).data()
    previousTrades = previousTrades.trades ? previousTrades.trades : []
    previousTrades = [...previousTrades, trade]
    previousTradeRef.set({trades: previousTrades.map(o => Object.assign({}, o))});
}

/*
 docRef.set({
    first: 'Ada',
    last: 'Lovelace',
    born: 1815
});
*/
