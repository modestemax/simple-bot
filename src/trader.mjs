import {dbEvent, MAX_CHANGED, first, getSignal} from "./db/index.mjs";
import {config, saveCurrentTrade, savePreviousTrade} from "./db/firestore.mjs";
import {tickUniqSymbol, stopTickUniqSymbol} from "./binance-tick.mjs";

let currentTrade
const noTrade = () => !currentTrade
const maxIsGoodToGo = () => first.percent >= config.enter_trade
const setCurrentTrade = (currentValue) => currentTrade = currentValue
const setFirstAsCurrentTrade = () => setCurrentTrade(first)
const clearCurrentTrade = () => setCurrentTrade(null)
const resetCurrentTrade = () => {
    if (config.current_trade && config.current_trade.symbol) {
        const signal = getSignal(config.current_trade.symbol)
        Object.assign(signal, config.current_trade)
        if (!signal.tradeStartedAtPercent) throw signal;
        setCurrentTrade(signal)
        setEyesOnCurrentTrade()
    }
}
const firstIsAboveCurrent = () => currentTrade.symbol !== first.symbol && first.percent - currentTrade.percent > config.acceptable_gap_between_first_and_second

export function initTrader(config) {
    resetCurrentTrade()
    dbEvent.on(MAX_CHANGED, async () => {
        if (maxIsGoodToGo()) {
            if (noTrade()) {
                setFirstAsCurrentTrade()
                await startTrade()
            } else if (firstIsAboveCurrent()) {
                await switchFirstCurrent()
            }
        }
    })
}


async function startTrade() {
    await bid();
    saveCurrentTrade(currentTrade)
    setEyesOnCurrentTrade()
}

async function stopTrade() {
    await ask();
    savePreviousTrade(currentTrade)
    clearCurrentTrade()
    stopTickUniqSymbol()
}

async function bid() {
    console.log('bid', currentTrade)
    currentTrade.tradeStarted()
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
        symbol: currentTrade.symbol, async handler() {
            if (currentTrade) {
                if (!currentTrade.tradeStartedAtPercent) throw currentTrade;
                if (currentTrade.isBelowStopLoss()) {
                    await stopTrade()
                } else if (currentTrade.isAboveTakeProfit()) {
                    if (currentTrade.hasLossOnGain()) {
                        await stopTrade()
                    }
                }
                if (currentTrade && percent !== currentTrade.percent) {
                    percent = currentTrade.percent
                    saveCurrentTrade(currentTrade)
                }
            } else {
                stopTickUniqSymbol()
            }
        }
    })
}
