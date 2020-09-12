import {cryptoMap} from "../db/index.mjs";
import consola from "consola";

let gotProfit
let lossCount = 0

export default {
    enter(signal) {
        const sortedByPercent = Object.values(cryptoMap).filter(a => a.percent)
            .sort((a, b) => a.percent < b.percent ? 1 : -1)
        return !gotProfit && (signal.symbol === sortedByPercent[0]?.symbol && signal.percent >= config.enter_trade)

    },

    async exit(trader) {
        if (trader.currentTrade?.isBelowStopLoss()) {
            lossCount++
            await trader.stopTrade()
        } else if (trader.currentTrade?.isPumping()) {
            //return
        } else if (trader.currentTrade?.isAboveTakeProfit()) {
            gotProfit = true
            await trader.stopTrade()
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