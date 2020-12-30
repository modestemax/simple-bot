import {cryptoMap} from "../db/index.mjs";
import firestore from "../db/firestore.mjs";
import consola from "consola";
import sendgrid from "../email";
import {config} from "../db/firestore";

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
        const enter = !gotProfit && (lossCount[signal.symbol] || 0) < config.symbol_max_loss && (signal.symbol === sortedByPercent[0]?.symbol && signal.isAboveEnterTrade() && signal.isNotPick())
        if (enter) {
            sendgrid.send({body: `enter trade:\nsignal=${JSON.stringify(signal)}\nconfig=${JSON.stringify(config)}`})
        }
        return enter
    },

    async exit(trader) {
        if (trader.currentTrade?.isBelowStopLoss() && trader.currentTrade?.isNotPick()) {
            try {
                await trader.stopTrade()
                sendgrid.send({body: `out trade:\ntrade=${JSON.stringify(trader)}\nconfig=${JSON.stringify(config)}`})
            } finally {
                lossCount[trader.currentTrade.symbol] = (lossCount[trader.currentTrade.symbol] || 0) + 1
                await firestore.saveLossCount(lossCount)
                sendgrid.send({subject, body: `Bad trade for ${trader.currentTrade.symbol}\nlossCount=${JSON.stringify(lossCount)}`})
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
        try {
            await trader.setQueueAsCurrent()
        } finally {
            lossCount[trader.currentTrade.symbol] = (lossCount[trader.currentTrade.symbol] || 0) + 1
        }
    }
}