import {dbEvent, MAX_CHANGED, first, max, getSignal} from "./db/index.mjs";
import {config, firestore} from "./db/firestore.mjs";
import {socketAPI} from "./binance-socket.mjs";
import {Trade} from "./db/SignalClass.mjs";

import consola from 'consola'
import {restAPI} from "./binance-rest.mjs";


let currentTrade
const noTrade = () => !currentTrade
const maxIsGoodToGo = () => first.percent >= first.max && first.percent >= config.enter_trade && first.percent >= max.max //todo Cannot read property 'max' of undefined

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
const firstIsAboveCurrent = () => currentTrade?.symbol !== first.symbol && first.percent - currentTrade.percent > config.acceptable_gap_between_first_and_second

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
    firestore.saveCurrentTrade(currentTrade)
    setEyesOnCurrentTrade()
}

async function stopTrade() {
    await ask();
    firestore.savePreviousTrade(currentTrade)
    firestore.saveCurrentTrade({})
    clearCurrentTrade()
}

async function bid() {
    console.log('bid', first)
    await restAPI.buyMarketPrice(first.symbol)
}

async function ask() {
    console.log('ask', currentTrade)
    currentTrade && await restAPI.sellMarketPrice(currentTrade.symbol)
}

async function switchFirstCurrent() {
    await stopTrade()
    await startTrade()
}

function setEyesOnCurrentTrade() {
    let percent;
    socketAPI.on(socketAPI.getTickEvent(currentTrade.symbol), async ({open, close}) => {
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
        }
    })
}