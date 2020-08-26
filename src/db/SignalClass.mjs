import {config, saveGrandMin} from './firestore.mjs';
import consola from 'consola'

const twoDecimal = (value) => Math.trunc(value * 100) / 100

export class Signal {
    symbol;
    _open;
    _close;
    _percent;
    _max = -Infinity;
    _min = Infinity;
    _time;
    _grandMin = 0;

    constructor({symbol, open, close, max, ...other}) {
        Object.assign(this, other)
        this.symbol = symbol;
        this.update({open, close, max})

    }

    update({open, close, high, max, min, ...other}) {
        Object.assign(this, other);
        this.open = open;
        this.close = close
        this.max = max
        this.min = min
        this.high = high
        this._time = new Date().toTimeString()
    }

    set high(value) {
        if (value) {
            this.max = twoDecimal(((+value - this.open) / this.open) * 100)
        }
    }

    get open() {
        return this._open
    }

    set open(value) {
        if (value) {
            this._open = +value;
            this.$percent()
        }
    }

    get close() {
        return this._close
    }

    set close(value) {
        if (value) {
            this._close = +value;
            this.$percent()
        }
    }

    get max() {
        return this._max
    }

    set max(value) {
        if (value) {
            this._max = +value
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
            this._min = +value
        }
    }

    $percent() {
        if (this.open && this.close) {
            this._percent = twoDecimal(((this.close - this.open) / this.open) * 100)
            this.#min()
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

    #grandMin() {
        if (this.min !== this.max) {
            const diff = twoDecimal(this.max - this.min)
            // diff > 1 && consola.info('min', this.symbol, diff)
            const oldGrandMin = this._grandMin
            // this._grandMin = Math.max(this._grandMin, diff)
            this._grandMin = this._grandMin || []
            if (!this._grandMin.includes(diff.toFixed(0)))
                this._grandMin = [diff.toFixed(0), ...this._grandMin]
            if (oldGrandMin !== this._grandMin) {
                // saveGrandMin(this.symbol, this._grandMin)
            }
        }
    }

}


export class Trade extends Signal {
    _tradeStartedAtPercent;
    _stopLoss;
    _startTime;

    constructor({tradeStartedAtPercent, max, min, ...signal}) {
        super(signal);
        Object.assign(this, signal)
        if (tradeStartedAtPercent && max) {
            this._tradeStartedAtPercent = tradeStartedAtPercent
            this.update({min, max})
        } else if (!(this.tradeStartedAtPercent && this.max)) {
            const error = new Error('cannot init trade')
            consola.error(error)
            throw error
        }
        this._stopLoss = this._stopLoss ? this._stopLoss : this.max - config.stop_lost;
        this._startTime = this._startTime ? this._startTime : new Date().toTimeString()
    }


    $percent() {
        super.$percent()
        if (this.open && this.close) {
            this._stopLoss = this.max - config.stop_lost
        }
    }

    get tradeStartedAtPercent() {
        return this._tradeStartedAtPercent
    }

    get stopLoss() {
        return this._stopLoss
    }

    isBelowStopLoss() {
        return this.percent < this.stopLoss
    }

    isAboveTakeProfit() {
        return this.max - this.tradeStartedAtPercent >= config.take_profit
    }

    hasLossOnGain() {
        const loss = this.max - this.percent
        // const gain = this.percent - this.tradeStartedAtPercent
        const virtualGain = this.max - this.tradeStartedAtPercent
        const percentLoss = loss / virtualGain * 100;
        return percentLoss >= config.acceptable_loss_on_gain_percentage
    }

}
