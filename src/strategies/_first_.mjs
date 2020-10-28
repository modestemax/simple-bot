import {cryptoMap} from "../db/index.mjs";
import firestore from "../db/firestore.mjs";
import consola from "consola";
import sendgrid from './email.mjs'

let gotProfit
let lossCount = {}
const subject = 'Bot First'

export default {
    set gotProfit(value) {
        gotProfit = value
    },
    set lostCount(value) {
        lossCount = value || {}
    },
    enter(signal) {
        const sortedByPercent = Object.values(cryptoMap).filter(a => a.percent)
            .sort((a, b) => a.percent < b.percent ? 1 : -1)
        return !gotProfit && (lossCount[signal.symbol] || 0) < config.symbol_max_loss && (signal.symbol === sortedByPercent[0]?.symbol && signal.isAboveEnterTrade() && signal.isNotPick())

    },

    async exit(trader) {
        if (trader.currentTrade?.isBelowStopLoss() && trader.currentTrade?.isNotPick()) {
            try {
                await trader.stopTrade()
            } finally {
                lossCount[trader.currentTrade.symbol] = (lossCount[trader.currentTrade.symbol] || 0) + 1
                await firestore.saveLossCount(lossCount)
                sendgrid.send({subject, body: `Bad trade for ${trader.currentTrade.symbol}`})
            }

        } else if (trader.currentTrade?.isPumping()) {
            //return
        } else if (trader.currentTrade?.isAboveTakeProfit()) {
            try {
                gotProfit = true
                await trader.stopTrade()
            } finally {
                const currentTrade = {...trader.currentTrade}
                await firestore.setProfitTag(currentTrade)
                sendgrid.send({subject, body: `End trade for ${trader.currentTrade.symbol}`})
            }
        }/* else if (currentTrade?.IsBelowEnterTrade()) {
                    consola.info('Stop trade')
                    await stopTrade()
                } *//*else if (currentTrade?.IsDelaying()) {
                    consola.info('Stop trade')
                    await stopTrade()
                }*/ /*else if (currentTrade.isMaxAboveTakeProfit()) {
                    if (currentTrade.hasLossOnGain()) {
                        log('Stop trade and take profit')
                        await stopTrade()
                    }
                }*/
    },

    async switch(trader) {
        consola.info('Switch  trade')
        await trader.setQueueAsCurrent()
    }
}