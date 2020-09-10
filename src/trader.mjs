import {config} from "./db/firestore.mjs";
import {socketAPI} from "./binance/binance-socket.mjs";
import {Trade} from "./db/SignalClass.mjs";

import consola from 'consola'
import {restAPI} from "./binance/binance-rest.mjs";
import {throttleWithCondition} from "./utils.mjs";
import {log, logTradeStatus, endStream} from "./log.mjs";


let currentTrade
let signalQueue

const setQueueAsCurrentTrade = () => currentTrade = signalQueue ? new Trade(Object.assign({}, signalQueue, {
    tradeStartedAtPercent: signalQueue.percent, max: signalQueue.percent,
    bidPrice: signalQueue.close
})) : null

const clearCurrentTrade = () => currentTrade = null

const firstIsAboveCurrent = () => currentTrade?.symbol !== restAPI.first.symbol && restAPI.first.percent - currentTrade.percent >= config.acceptable_gap_between_first_and_second
const addQueue = (signal) => signalQueue = signal

async function startTrade() {
    if (await bid()) {
        config.oco && await ask()
        await setQueueAsCurrentTrade()
        await setEyesOnCurrentTrade()
    }
}

async function stopTrade() {
    config.oco || await ask()

    logTradeStatus(currentTrade)
    await clearCurrentTrade()

}

async function bid() {
    console.log('bid', signalQueue)
    return signalQueue && await restAPI.bid(signalQueue.symbol)
}

async function ask() {
    console.log('ask', currentTrade)
    // currentTrade && await restAPI.ask({symbol: currentTrade.symbol, /*quoteOrderQty: currentTrade.close*/})
    return currentTrade && await restAPI.ask(currentTrade)
}

async function setQueueAsCurrent() {
    await stopTrade()
    await startTrade()
}

function setEyesOnCurrentTrade() {
    let percent;
    followTrade()

    function followTrade() {
        currentTrade && socketAPI.once(`${currentTrade.symbol}@bookTicker`, async ({open, close, bid, ask}) => {
            try {
                currentTrade?.update({open, close: bid})//set close with bid because we will sell to the best buyer
                if (currentTrade?.isBelowStopLoss()) {
                    await stopTrade()
                } else if (currentTrade?.isPumping()) {
                    //return
                } else if (currentTrade?.isAboveTakeProfit()) {
                    await stopTrade()
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
                logTrade()
            } finally {
                followTrade()
            }
        })
    }

    const logTrade = throttleWithCondition(() => percent !== currentTrade?.percent, function () {
        consola.info('trade', currentTrade?.symbol, 'start:', currentTrade?.tradeStartedAtPercent, 'percent:', currentTrade?.percent, 'stop:', currentTrade?.stopLoss)
        percent = currentTrade?.percent
    })
}

export function initTrader() {
    listenTradeEvent()
    listenFinalEvent()

    function listenTradeEvent() {
        socketAPI.once(socketAPI.TRADE_EVENT, async (signal) => {
            try {
                if (signal) {
                    addQueue(signal)
                    if (!currentTrade) {
                        consola.info('Start trade')
                        await startTrade()
                    } /*else if (firstIsAboveCurrent()) {
                    consola.info('Switch  trade')
                    await switchFirstCurrent()
                }*/ else if (currentTrade?.IsDelaying()) {
                        if (currentTrade?.isLosing() || !currentTrade?.isPumping()) {
                            consola.info('Switch  trade')
                            await setQueueAsCurrent()
                        }
                    }
                }

                // if (await maxIsGoodToGo()) {

                // }
            } finally {
                listenTradeEvent()
            }

        })
    }

    function listenFinalEvent() {
        socketAPI.once(socketAPI.FINAL_EVENT, async (symbol) => {
            // try {
            //     if (currentTrade?.symbol === symbol) {
            currentTrade && await stopTrade()
            await restartProcess() //must restart pm2
            // }
            // } finally {
            //     currentTrade ? checkFinal() : restartProcess() //must restart pm2
            // }
        })
    }
}

async function restartProcess() {
    console.log("This is pid " + process.pid);
    // // setTimeout(function () {
    process.on("exit", async () => {

    })
    if (restAPI.max.max >= config.enter_trade) {
        log(`restarting process with candle max ${restAPI.max.symbol} max:${restAPI.max.max}% close:${restAPI.max.percent}%\n\n`)
    }
    await endStream()
    // process.exit();
    setTimeout(() => process.exit(), 10e3);
    // }, 5000);
}