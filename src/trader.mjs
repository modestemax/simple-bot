import {dbEvent, MAX_CHANGED, first, getSignal} from "./db/index.mjs";
import {config, saveCurrentTrade, savePreviousTrade} from "./db/firestore.mjs";
import {tickUniqSymbol, stopTickUniqSymbol} from "./binance-tick.mjs";
import {Trade} from "./db/SignalClass.mjs";

import consola from 'consola'


let currentTrade
const noTrade = () => !currentTrade
const maxIsGoodToGo = () => first.percent >= first.max && first.percent >= config.enter_trade && first.percent >= config.first.max //must be greater than day max
const setCurrentTrade = (currentValue) => currentTrade = currentValue
const setFirstAsCurrentTrade = () =>
    setCurrentTrade(new Trade(Object.assign({}, first, {tradeStartedAtPercent: first.percent, max: first.percent,})))

const clearCurrentTrade = () => setCurrentTrade(null)
const resetCurrentTrade = () => {
    if (config.current_trade && config.current_trade.symbol) {
        const signal = getSignal(config.current_trade.symbol)
        setCurrentTrade(new Trade(Object.assign({}, signal, config.current_trade)))
        setEyesOnCurrentTrade()
    }
}
const firstIsAboveCurrent = () => currentTrade.symbol !== first.symbol && first.percent - currentTrade.percent > config.acceptable_gap_between_first_and_second

export function initTrader() {
    resetCurrentTrade()
    dbEvent.on(MAX_CHANGED, async () => {
        if (maxIsGoodToGo()) {
            if (noTrade()) {
                consola.info('Start trade')
                await startTrade()
            } else if (firstIsAboveCurrent()) {
                consola.info('Switch  trade')
                await switchFirstCurrent()
            }
        }
    })
}


async function startTrade() {
    await bid();
    setFirstAsCurrentTrade()
    saveCurrentTrade(currentTrade)
    setEyesOnCurrentTrade()
}

async function stopTrade() {
    await ask();
    savePreviousTrade(currentTrade)
    saveCurrentTrade({})
    clearCurrentTrade()
    stopTickUniqSymbol()
}

async function bid() {
    console.log('bid', first)
}

async function ask() {
    console.log('ask', currentTrade)
}

async function switchFirstCurrent() {
    await stopTrade()
    setFirstAsCurrentTrade()
    await startTrade()
}

function setEyesOnCurrentTrade() {
    let percent;
    tickUniqSymbol({
        symbol: currentTrade.symbol, async handler({open, close}) {
            if (currentTrade) {
                currentTrade.update({open, close})
                if (currentTrade.isBelowStopLoss()) {
                    consola.info('Stop loss')
                    await stopTrade()
                } else if (currentTrade.isAboveTakeProfit()) {
                    if (currentTrade.hasLossOnGain()) {
                        consola.info('Stop trade and take profit')
                        await stopTrade()
                    }
                }
                if (currentTrade && percent !== currentTrade.percent) {
                    consola.info(currentTrade)
                    percent = currentTrade.percent
                    saveCurrentTrade(currentTrade)
                }
            } else {
                stopTickUniqSymbol()
            }
        }
    })
}


