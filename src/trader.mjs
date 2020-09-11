import socketAPI from "./binance/binance-socket.mjs";
import {Trade} from "./db/SignalClass.mjs";

import consola from 'consola'
import {restAPI} from "./binance/binance-rest.mjs";
import {throttleWithCondition, ONE_SECOND} from "./utils.mjs";
import {log, logTradeStatus, endStream} from "./log.mjs";

export default new class {
    #currentTrade
    #signalQueue

    get currentTrade() {
        return this.#currentTrade
    }

    get signalQueue() {
        return this.#signalQueue
    }

    init() {
        this.listenTradeEvent()
        this.listenFinalEvent()
    }


    listenTradeEvent() {
        socketAPI.once(socketAPI.TRADE_EVENT, async (signal) => {
            try {
                if (signal) {
                    this.addQueue(signal)
                    if (!this.currentTrade) {
                        consola.info('Start trade')
                        await this.startTrade()
                    } /*else if (firstIsAboveCurrent()) {
                    consola.info('Switch  trade')
                    await switchFirstCurrent()
                }*/ else {
                        signal.symbol !== this.currentTrade.symbol && await config.strategy?.switch(this)
                    }
                }

                // if (await maxIsGoodToGo()) {

                // }
            } finally {
                this.listenTradeEvent()
            }

        })
    }


    listenFinalEvent() {
        socketAPI.once(socketAPI.FINAL_EVENT, async () => {
            await this.stopTrade()
            await this.restartProcess() //must restart pm2
        })
    }

    async startTrade() {
        if (await this.bid()) {
            config.oco && await this.ask()
            await this.setQueueAsCurrentTrade()
            await this.setEyesOnCurrentTrade()
        }
    }

    async stopTrade() {
        if (this.currentTrade) {
            config.oco || await this.ask()
            logTradeStatus(this.currentTrade)
            await this.clearCurrentTrade()
        }
    }

    clearCurrentTrade() {
        this.#currentTrade = null
    }


    setQueueAsCurrentTrade() {
        const signalQueue = this.#signalQueue
        this.#currentTrade = signalQueue ? new Trade(Object.assign({}, signalQueue, {
            tradeStartedAtPercent: signalQueue.percent, max: signalQueue.percent,
            bidPrice: signalQueue.close
        })) : null
    }

    addQueue(signal) {
        this.#signalQueue = signal
    }

    async bid() {
        const signalQueue = this.#signalQueue
        console.log('bid', signalQueue)
        return signalQueue && await restAPI.bid(signalQueue.symbol)
    }

    async ask() {
        const currentTrade = this.currentTrade
        console.log('ask', currentTrade)
        // currentTrade && await restAPI.ask({symbol: currentTrade.symbol, /*quoteOrderQty: currentTrade.close*/})
        return currentTrade && await restAPI.ask(currentTrade)
    }

    async setQueueAsCurrent() {
        await this.stopTrade()
        await this.startTrade()
    }

    setEyesOnCurrentTrade() {
        const trader = this
        let percent
        followTrade()

        function followTrade() {
            const currentTrade = trader.currentTrade
            currentTrade && socketAPI.once(socketAPI.getTickEvent(currentTrade.symbol), async ({open, close}) => {
                try {
                    // currentTrade?.update({open, close: bid})//set close with bid because we will sell to the best buyer
                    currentTrade?.update({open, close})
                    await config.strategy?.exit(trader)
                    logTrade()
                } finally {
                    followTrade()
                }
            })


            const logTrade = throttleWithCondition(() => percent !== currentTrade?.percent, function () {
                consola.info('trade', currentTrade?.symbol, 'start:', currentTrade?.tradeStartedAtPercent, 'percent:', currentTrade?.percent, 'stop:', currentTrade?.stopLoss)
                percent = currentTrade?.percent
            })
        }
    }

    async restartProcess() {
        console.log("This is pid " + process.pid);
        // // setTimeout(function () {
        process.on("exit", async () => {
            debugger
        })
        if (socketAPI.max.max >= config.enter_trade) {
            log(`restarting process with candle max ${socketAPI.max.symbol} max:${socketAPI.max.max}% close:${socketAPI.max.percent}%\n\n`)
        }
        await endStream()
        // process.exit();
        setTimeout(() => process.exit(), 10 * ONE_SECOND);
        // }, 5000);
    }

    firstIsAboveCurrent() {
        const currentTrade = this.currentTrade
        return currentTrade?.symbol !== socketAPI.first.symbol && socketAPI.first.percent - currentTrade.percent >= config.acceptable_gap_between_first_and_second
    }

}

