import {cryptoMap} from "../db/index.mjs";
import firestore from "../db/firestore.mjs";
import consola from "consola";

let gotProfit
let lastExitPercent
let tradeStarted
export default {
    set gotProfit(value) {
        gotProfit = value
    },
    set tradeStarted(value) {
        tradeStarted = value?.tradeStarted
        lastExitPercent = value?.lastExitPercent || 0
    },
    enter(signal) {
        const sortedByPercent = Object.values(cryptoMap).filter(a => a.percent)
            .sort((a, b) => a.percent < b.percent ? 1 : -1)
        if (!gotProfit) {
            if (signal.symbol === sortedByPercent[0]?.symbol) {
                if (signal.isNotPick()) {
                    if (!tradeStarted) {
                        if (signal.isAboveEnterTrade(lastExitPercent)) {
                            tradeStarted = true
                            firestore.setTradeStarted({tradeStarted, lastExitPercent})
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
        } else if (trader.currentTrade?.percent < (config.enter_trade - 2 * config.stop_lost)) {
            lastExitPercent = trader.currentTrade?.percent
            tradeStarted = false
            await trader.stopTrade()
            firestore.setTradeStarted({tradeStarted, lastExitPercent})
        }
    },

    async switch(trader) {
        consola.info('Switch  trade')
        await trader.setQueueAsCurrent()
        lastExitPercent = trader.currentTrade?.percent
        firestore.setTradeStarted({tradeStarted, lastExitPercent})
    }
}