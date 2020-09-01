import {dbEvent, MAX_CHANGED, first, max, getSignal} from "./db/index.mjs";
import {config, firestore} from "./db/firestore.mjs";
import {socketAPI} from "./binance/binance-socket.mjs";
import {Trade} from "./db/SignalClass.mjs";

import consola from 'consola'
import {restAPI} from "./binance/binance-rest.mjs";


let currentTrade
const noTrade = () => !currentTrade
const maxIsGoodToGo = () => first.percent >= first.max && first.percent >= config.enter_trade //&& first.percent >= max.max

const setCurrentTrade = (currentValue) => currentTrade = currentValue
const setFirstAsCurrentTrade = () =>
    setCurrentTrade(new Trade(Object.assign({}, first, {tradeStartedAtPercent: first.percent, max: first.percent,})))

const clearCurrentTrade = () => setCurrentTrade(null)
// const resetCurrentTrade = () => {
//     if (config.current_trade && config.current_trade.symbol) {
//         const signal = getSignal(config.current_trade.symbol)
//         setCurrentTrade(new Trade(Object.assign({}, signal, config.current_trade)))
//         setEyesOnCurrentTrade()
//     }
// }
const firstIsAboveCurrent = () => currentTrade?.symbol !== first.symbol && first.percent - currentTrade.percent > config.acceptable_gap_between_first_and_second


async function startTrade() {
    await bid();
    await setFirstAsCurrentTrade()
    await firestore.saveCurrentTrade(currentTrade)
    await setEyesOnCurrentTrade()
}

async function stopTrade() {
    await ask();
    await firestore.savePreviousTrade(currentTrade)
    await firestore.saveCurrentTrade({})
    await clearCurrentTrade()
}

async function bid() {
    console.log('bid', first)
    await restAPI.bid(first.symbol)
}

async function ask() {
    console.log('ask', currentTrade)
    // currentTrade && await restAPI.ask({symbol: currentTrade.symbol, /*quoteOrderQty: currentTrade.close*/})
    currentTrade && await restAPI.ask(currentTrade.symbol)
}

async function switchFirstCurrent() {
    await stopTrade()
    await startTrade()
}

function setEyesOnCurrentTrade() {
    let percent;
    followTrade()

    function followTrade() {
        currentTrade && socketAPI.once(socketAPI.getTickEvent(currentTrade.symbol), async ({open, close}) => {
            try {
                if (currentTrade) {
                    currentTrade.update({open, close})

                    if (currentTrade.isBelowStopLoss()) {
                        consola.info('Stop loss')
                        await stopTrade()
                    } else if (currentTrade.isAboveTakeProfit()) {
                        consola.info('Stop trade and take profit')
                        await stopTrade()
                    } else if (currentTrade.isMaxAboveTakeProfit()) {
                        if (currentTrade.hasLossOnGain()) {
                            consola.info('Stop trade and take profit')
                            await stopTrade()
                        }
                    }
                    if (percent !== currentTrade?.percent) {
                        consola.info(currentTrade)
                        percent = currentTrade?.percent
                        firestore.saveCurrentTrade(currentTrade)
                    }

                    consola.info('trade', currentTrade?.symbol, 'start:', currentTrade?.tradeStartedAtPercent, 'percent:', currentTrade?.percent, 'stop:', currentTrade?.stopLoss)
                }
            } finally {
                followTrade()
            }
        })
    }

}

export function initTrader() {
    // resetCurrentTrade()
    checkMax()
    checkFinal()

    function checkMax() {
        dbEvent.once(MAX_CHANGED, async () => {
            try {
                if (await maxIsGoodToGo()) {
                    if (await noTrade()) {
                        consola.info('Start trade')
                        await startTrade()
                    } else if (await firstIsAboveCurrent()) {
                        consola.info('Switch  trade')
                        await switchFirstCurrent()
                    }
                }
            } finally {
                checkMax()
            }

        })
    }

    function checkFinal() {
        dbEvent.once(socketAPI.FINAL_EVENT, async (symbol) => {
            try {
                currentTrade?.symbol === symbol && await stopTrade()
            } finally {
                checkFinal()
            }
        })
    }
}