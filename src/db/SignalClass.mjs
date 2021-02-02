//import consola from 'consola'
import {ONE_MINUTE} from "../utils.mjs";

const twoDecimal = (value) => Math.trunc(value * 100) / 100
export const percent = (close, open) => (close - open) / open * 100


export class Signal {
    symbol;
    _open;
    _close;
    _percent;
    _max = -Infinity;
    _min = Infinity;
    _time;
    _grandMin = 0;
    #prevSignal
    #pick = 0

    constructor({symbol, open, close, max, ...other} = {}) {
        Object.assign(this, other)
        this.symbol = symbol;
        this.open = open;
        this.close = close
        this.max = max
        this.#prevSignal = null
    }

    updateWith(signal) {
        signal && Object.assign(this, signal)
    }

    update({open, close, high, max, min, ...other}) {
        this.#prevSignal = new Signal(this)// Object.assign({}, this)
        Object.assign(this, other);
        this.open = open;
        this.close = close
        this.max = max
        this.min = min
        this.high = high
        this.#pick += +this.isPick()
        this._time = new Date().toTimeString()
    }

    isPick() {
        return Math.abs(this.prevSignal?.percent - this.percent) >= config.min_pick
    }

    isNotPick() {
        return !this.isPick()
    }

    set high(value) {
        if (value) {
            this.max = twoDecimal(percent(value, this.open))
        }
    }

    get prevSignal() {
        return this.#prevSignal
    }

    get pick() {
        return this.#pick
    }

    get open() {
        return this._open
    }

    set open(value) {
        if (value) {
            this._open = value;
            this.$percent()
        }
    }

    get close() {
        return this._close
    }

    set close(value) {
        if (value) {
            this._close = value;
            this.$percent()
        }
    }

    get max() {
        return this._max
    }

    set max(value) {
        if (value) {
            this._max = value
        }
    }

    get percent() {
        return this._percent
    }


    get min() {
        return this._min
    }

    set min(value) {
        if (value) {
            this._min = value
        }
    }

    get grandMin() {
        return this._grandMin
    }

    $percent() {
        if (this.open && this.close) {
            this._percent = twoDecimal(percent(this.close, this.open))
            this.#min()
            this.#max()
        }
    }

    #min() {
        this.#grandMin()
        if (this.percent === this.max) {
            this._min = this.max
        } else {
            this._min = Math.min(this.percent, this._min)
        }
    }

    #max() {
        this.max = Math.max(this.percent, this.max)
    }

    #grandMin() {
        if (this.min !== this.max) {
            const diff = twoDecimal(this.max - this.min).toFixed(0)
            // diff > 1 && consola.info('min', this.symbol, diff)
            const oldGrandMin = this.grandMin
            // this._grandMin = Math.max(this._grandMin, diff)
            const grandMin = this.grandMin || []
            if (isFinite(diff) && !grandMin.includes(diff))
                this._grandMin = [diff, ...grandMin]
            if (oldGrandMin !== this.grandMin) {
                //firestore.saveGrandMin(this.symbol, this._grandMin)
            }
        }
    }

    isPumping() {
        return this.percent >= this.max
    }

    isBelowEnterTrade() {
        return !this.isAboveEnterTrade()
    }

    isAboveEnterTrade(enter_trade) {
        return this.percent >= (enter_trade || config.enter_trade)
    }

    isAboveTakeProfit() {
        return this.percent >= config.enter_trade + config.take_profit
    }

    _forceBuy
    get forceBuy() {

        if (this instanceof Trade)
            return cryptoMap[this.symbol]._forceBuy
        return this._forceBuy
    }

    set forceBuy(value) {
        this._forceBuy = value
        this._forceSell = !value
    }

    _forceSell
    get forceSell() {
        if (this instanceof Trade)
            return cryptoMap[this.symbol].forceSell
        return this._forceSell
    }

    set forceSell(value) {
        this._forceSell = value
        this._forceBuy = !value
    }
}


export class Trade extends Signal {
    _tradeStartedAtPercent;
    _bidPrice;
    _stopLoss;
    _initialStopLoss;
    _startTime;


    constructor({tradeStartedAtPercent, bidPrice, max, min, grandMin, ...signal}) {
        super(signal);
        Object.assign(this, signal)

        if (tradeStartedAtPercent && max && bidPrice) {
            this._bidPrice = bidPrice
            this._tradeStartedAtPercent = tradeStartedAtPercent
            this.update({min, max})
        } else if (!(this.tradeStartedAtPercent && this.max)) {
            const error = new Error('cannot init trade')
            console.error(error)
            throw error
        }
        this._initialStopLoss = +(this._stopLoss ? this._stopLoss : this.tradeStartedAtPercent - config.stop_lost).toFixed(2);
        this._stopLoss = this._initialStopLoss
        this._startTime = this._startTime ? this._startTime : Date.now()
        this._grandMin = grandMin?.length ? ['/', ...grandMin] : null
    }


    $percent() {
        super.$percent()
        if (this.open && this.close) {
            if (config.trailing_stop_loss) {
                const trailing_step = +config.trailing_stop_loss_step ? +config.trailing_stop_loss_step : 0
                const max_gain = this.max - this.tradeStartedAtPercent
                const step_count = Math.floor(max_gain / trailing_step)
                this._stopLoss = this._initialStopLoss + +(step_count * trailing_step).toFixed(2)
            }
        }
    }

    get tradeStartedAtPercent() {
        return this._tradeStartedAtPercent
    }

    get bidPrice() {
        return this._bidPrice;
    }

    get stopLoss() {
        return this._stopLoss
    }

    isBelowStopLoss() {
        return this.percent < this.stopLoss
    }

    get change() {
        return this.percent - this.tradeStartedAtPercent
    }

    isMaxAboveTakeProfit() {
        return this.max - this.tradeStartedAtPercent >= config.take_profit
    }

    isAboveTakeProfit() {
        return this.change >= config.take_profit
    }

    hasLossOnGain() {
        const loss = this.max - this.percent
        // const gain = this.percent - this.tradeStartedAtPercent
        const virtualGain = this.max - this.tradeStartedAtPercent
        const percentLoss = loss / virtualGain * 100;
        return percentLoss >= config.acceptable_loss_on_gain_percentage
    }

    isLosing() {
        return this.percent < this.tradeStartedAtPercent
    }

    IsDelaying() {
        return Date.now() - this._startTime > config.trade_max_time_minute * ONE_MINUTE
    }

}
