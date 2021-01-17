import socketAPI from "./binance/binance-socket.mjs";
import {Trade} from "./db/SignalClass.mjs";

import {restAPI} from "./binance/binance-rest.mjs";
import {ONE_SECOND} from "./utils.mjs";
import {log, logTradeProgress, logSendMessage, logTradeStatus, endStream} from "./log.mjs";


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
        process.nextTick(() => socketAPI.once(socketAPI.TRADE_EVENT, async (signal) => {
            try {
                if (signal) {
                    this.addQueue(signal)
                    if (!this.currentTrade) {
                        logSendMessage(`Starting trade #${signal.symbol}`)
                        await this.startTrade()
                        logSendMessage(`Started trade #${signal.symbol}`)
                    } else {
                        signal.symbol !== this.currentTrade.symbol && await config.strategy?.switch(this)
                    }
                }
            } finally {
                this.listenTradeEvent()
            }
        }))
    }


    listenFinalEvent() {
        socketAPI.once(socketAPI.FINAL_EVENT, async () => {
            await this.stopTrade()
            await this.restartProcess() //must restart pm2
        })
    }

    async startTrade() {
        logSendMessage('Starting trade')
        if (await this.bid()) {
            try {
                config.oco && await this.ask()
                await this.setQueueAsCurrentTrade()
                await this.setEyesOnCurrentTrade()
            } catch {
                logSendMessage('Starting trade fail')
                process.exit()
            }

        }
    }

    async stopTrade() {
        logSendMessage('Stopping trade')
        if (this.currentTrade) {
            try {
                config.oco || await this.ask()
                logTradeStatus(this.currentTrade)
                await this.clearCurrentTrade()
            } catch {
                logSendMessage('Stopping trade fail')
                process.exit()
            }

        }
    }

    clearCurrentTrade() {
        this.#currentTrade = null
    }


    setQueueAsCurrentTrade() {
        const signalQueue = this.#signalQueue
        this.#currentTrade = signalQueue ?
            new Trade(Object.assign({}, signalQueue,
                {
                    tradeStartedAtPercent: signalQueue.percent,
                    max: signalQueue.percent,
                    bidPrice: signalQueue.close,
                    grandMin: signalQueue.grandMin,
                }
            )) : null
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
        followTrade()

        function followTrade() {
            const currentTrade = trader.currentTrade
            currentTrade && socketAPI.once(socketAPI.getTickEvent(currentTrade.symbol), async ({open, close}) => {
                try {
                    trader.restartIfNoTickEvent()
                    // currentTrade?.update({open, close: bid})//set close with bid because we will sell to the best buyer
                    currentTrade?.update({open, close})
                    await config.strategy?.exit(trader)

                    logTradeProgress(currentTrade)
                } finally {
                    followTrade()
                }
            })
        }
    }

    async restartProcess() {
        console.log("This is pid " + process.pid);
        // // setTimeout(function () {
        process.on("exit", async () => {
            //   debugger
        })
        if (socketAPI.max.max >= config.enter_trade) {
            log(`end candle restarting process with candle max ${socketAPI.max.symbol} max:${socketAPI.max.max}% close:${socketAPI.max.percent}% m:${socketAPI.max.grandMin}  pick:${socketAPI.max.pick}\n\n`)
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

    #tickEventTimeOutHandle

    restartIfNoTickEvent() {
        clearTimeout(this.#tickEventTimeOutHandle)
        this.#tickEventTimeOutHandle = setTimeout(async function checkTrade() {
            logSendMessage('trade is running but there is no tick event restarting bot ')
            process.exit()
        }.bind(this), ONE_SECOND * 60)
    }

}

