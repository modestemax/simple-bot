export default {
    enter(signal) {
        return signal.percent >= config.enter_trade && signal.percent >= signal.max
    },

    async exit(trader) {
        if (trader.currentTrade?.isBelowStopLoss()) {
            await trader.stopTrade()
        } else if (trader.currentTrade?.isPumping()) {
            //return
        } else if (trader.currentTrade?.isAboveTakeProfit()) {
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
    }
}