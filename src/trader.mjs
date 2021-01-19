import socketAPI from "./binance/binance-socket.mjs";
import {Trade} from "./db/SignalClass.mjs";

import {restAPI} from "./binance/binance-rest.mjs";
import {ONE_SECOND} from "./utils.mjs";
import {log, logTradeProgress, logSendMessage, logTradeStatus, endStream} from "./log.mjs";


export default global.trader = new class {
    #currentTrade
    #signalQueue

    get currentTrade() {
        return this.#currentTrade
    }

    get signalQueue() {
        return this.#signalQueue
    }

    init() {
        this.listenErrorEvent()
        this.listenTradeEvent()
        this.listenFinalEvent()
    }


    listenErrorEvent() {
        socketAPI.on('error', (err) => {
            logSendMessage('whoops! there was an error in trader module :' + err?.message)
            processExit()
        });
    }

    listenTradeEvent() {
        socketAPI.once(socketAPI.TRADE_EVENT, async (signal) => {
            //  console.log('AA')
            let error
            try {
                if (signal) {
                    this.addQueue(signal)
                    if (!this.currentTrade) {
                        await this.startTrade()
                    } else {
                        signal.symbol !== this.currentTrade.symbol && await config.strategy?.switch(this)
                    }
                }
            } catch (e) {
                error = true
                setTimeout(this.listenTradeEvent.bind(this), ONE_SECOND * 10)
            } finally {
                error || this.listenTradeEvent()
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
        try {
            logSendMessage(`Starting trade #${this.signalQueue?.symbol}`)
            if (await this.bid()) {
                config.oco && await this.ask()
                await this.setQueueAsCurrentTrade()
                await this.setEyesOnCurrentTrade()
                logSendMessage(`Trade started #${this.signalQueue?.symbol}`)
            }
            logSendMessage(`Trade start returned false: no trade started #${this.signalQueue?.symbol}`)
        } catch (e) {
            logSendMessage(`Starting trade fail #${this.signalQueue?.symbol} \n${new Error(e).message}`)
            //  processExit()
        } finally {

        }
    }

    async stopTrade() {
        try {
            if (this.currentTrade) {
                logSendMessage(`Stopping trade #${this.currentTrade?.symbol}`)
                config.oco || await this.ask()
                logTradeStatus(this.currentTrade)
                await this.clearCurrentTrade()
                logSendMessage(`Trade stopped #${this.currentTrade?.symbol}`)
            }
        } catch (e) {
            logSendMessage(`stopping trade fail #${this.currentTrade?.symbol} \n${new Error(e).message}`)
            processExit()
        } finally {

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
        redisClient.set('above', JSON.stringify({}))
        redisClient.set('symbols', JSON.stringify(Object.keys(global.cryptoMap)))
        // // setTimeout(function () {
        process.on("exit", async () => {
            //   debugger
        })
        if (socketAPI.max.max >= config.enter_trade) {
            log(`end candle restarting process with candle max ${socketAPI.max.symbol} max:${socketAPI.max.max}% close:${socketAPI.max.percent}% m:${socketAPI.max.grandMin}  pick:${socketAPI.max.pick}\n\n`)
        }
        await endStream()
        // process.exit();
        setTimeout(() => processExit(), 10 * ONE_SECOND);
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
            processExit()
        }.bind(this), ONE_SECOND * 60)
    }

}

