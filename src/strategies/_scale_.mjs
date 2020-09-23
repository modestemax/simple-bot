import {cryptoMap} from "../db/index.mjs";
import firestore from "../db/firestore.mjs";
import consola from "consola";

let gotProfit
let lossCount = 0
let tradeStarted
export default {
    set gotProfit(value) {
        gotProfit = value
    },
    set tradeStarted(value) {
        tradeStarted = value
    },
    enter(signal) {
        const sortedByPercent = Object.values(cryptoMap).filter(a => a.percent)
            .sort((a, b) => a.percent < b.percent ? 1 : -1)
        if (!gotProfit) {
            if (signal.symbol === sortedByPercent[0]?.symbol) {
                if (signal.isNotPick()) {
                    if (!tradeStarted) {
                        if (signal.isAboveEnterTrade()) {
                            tradeStarted = true
                            firestore.setTradeStarted(signal)
                            return true
                        }
                    } else {
                        if (signal.percent - sortedByPercent[1].percent >= config.acceptable_gap_between_first_and_second) {
                            return true
                        }
                    }
                }
            }
        }
    },

    async exit(trader) {

        if (trader.currentTrade?.percent >= config.take_profit + config.enter_trade) {
            gotProfit = true
            const currentTrade = {...trader.currentTrade}
            await trader.stopTrade()
            await firestore.setProfitTag(currentTrade)
        }
    },

    async switch(trader) {
        consola.info('Switch  trade')
        await trader.setQueueAsCurrent()
    }
}