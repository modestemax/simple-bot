import {dbEvent, MAX_CHANGED, first, max, getSignal} from "./db/index.mjs";
import {config, firestore} from "./db/firestore.mjs";
import {socketAPI} from "./binance/binance-socket.mjs";
import {Trade} from "./db/SignalClass.mjs";

import consola from 'consola'
import {restAPI} from "./binance/binance-rest.mjs";
import {log, endStream} from "./utils.mjs";


let currentTrade
const noTrade = () => !currentTrade
const maxIsGoodToGo = () => first.percent >= first.max && first.percent >= config.enter_trade //&& first.percent >= max.max

const setCurrentTrade = (currentValue) => currentTrade = currentValue
const setFirstAsCurrentTrade = () =>
    setCurrentTrade(new Trade(Object.assign({}, first, {
        tradeStartedAtPercent: first.percent, max: first.percent,
        bidPrice: first.close
    })))

const clearCurrentTrade = () => setCurrentTrade(null)

const firstIsAboveCurrent = () => currentTrade?.symbol !== first.symbol && first.percent - currentTrade.percent >= config.acceptable_gap_between_first_and_second


async function startTrade() {
    if (await bid()) {
        config.oco && await ask()
        await setFirstAsCurrentTrade()
        // await firestore.saveCurrentTrade(currentTrade)
        await setEyesOnCurrentTrade()
    }
}

async function stopTrade() {
    if (config.oco || await ask()) {
        // await firestore.savePreviousTrade(currentTrade)
        // await firestore.saveCurrentTrade({})
        if (currentTrade) {//log
            let symbolResume = `${currentTrade.symbol}\tb:${currentTrade.bidPrice} (${currentTrade.tradeStartedAtPercent}%)\tc:${currentTrade.close} (${currentTrade.percent}%)`
            symbolResume += currentTrade.grandMin ? `\tm:${currentTrade.grandMin}` : ""
            symbolResume += "\n\n"
            if (currentTrade.percent <= currentTrade.tradeStartedAtPercent) {
                log(`Stop loss : ${symbolResume} `)
            } else {
                log(`Take profit : ${symbolResume}`)
            }
        }
        await clearCurrentTrade()

    }
}

async function bid() {
    console.log('bid', first)
    return await restAPI.bid(first.symbol)
}

async function ask() {
    console.log('ask', currentTrade)
    // currentTrade && await restAPI.ask({symbol: currentTrade.symbol, /*quoteOrderQty: currentTrade.close*/})
    return currentTrade && await restAPI.ask(currentTrade)
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
                currentTrade?.update({open, close})
                if (currentTrade?.isBelowStopLoss()) {
                    await stopTrade()
                } else if (currentTrade?.isAboveTakeProfit()) {
                    await stopTrade()
                } else if (currentTrade?.IsBelowEnterTrade()) {
                    consola.info('Stop trade')
                    await stopTrade()
                } else if (currentTrade?.IsDelaying()) {
                    consola.info('Stop trade')
                    await stopTrade()
                } else if (currentTrade.isMaxAboveTakeProfit()) {
                    if (currentTrade.hasLossOnGain()) {
                        log('Stop trade and take profit')
                        await stopTrade()
                    }
                }
                {//log
                    if (percent !== currentTrade?.percent) {
                        consola.info('trade', currentTrade?.symbol, 'start:', currentTrade?.tradeStartedAtPercent, 'percent:', currentTrade?.percent, 'stop:', currentTrade?.stopLoss)
                        percent = currentTrade?.percent
                        // firestore.saveCurrentTrade(currentTrade)
                    }
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
                // if (await maxIsGoodToGo()) {
                if (noTrade()) {
                    consola.info('Start trade')
                    await startTrade()
                } else if (firstIsAboveCurrent()) {
                    consola.info('Switch  trade')
                    await switchFirstCurrent()
                }
                // }
            } finally {
                checkMax()
            }

        })
    }

    function checkFinal() {
        socketAPI.on(socketAPI.FINAL_EVENT, async (symbol) => {
            try {
                if (currentTrade?.symbol === symbol) {
                    await stopTrade()
                    restartProcess() //must restart pm2
                }
            } finally {
                // checkFinal()
                currentTrade || restartProcess() //must restart pm2
            }
        })
    }
}

async function restartProcess() {
    console.log("This is pid " + process.pid);
    // // setTimeout(function () {
    process.on("exit", async () => {

    });
    log('restarting process')
    log(`candle max ${max.symbol} max:${max.max}% close:${max.close}`)
    log(`\n\n`)

    await endStream()
    process.exit();
    // setTimeout(() => process.exit(), 3e3);
    // }, 5000);
}