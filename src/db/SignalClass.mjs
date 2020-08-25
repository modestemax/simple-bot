import {config, saveGrandMin} from './firestore.mjs';
import consola from 'consola'

const twoDecimal = (value) => Math.trunc(value * 100) / 100

export class Signal {
    symbol;
    _open;
    _close;
    _percent;
    _max = 0;
    _min = 0;
    _time;
    _grandMin = 0;

    constructor({symbol, open, close, ...other}) {
        Object.assign(this, other)
        this.symbol = symbol;
        +open && (this.open = +open);
        +close && (this.close = +close)

        this._time = new Date().toTimeString()

    }


    get open() {
        return this._open
    }

    set open(value) {
        this._open = value;
        this.$percent()
    }

    get close() {
        return this._close
    }

    set close(value) {
        this._close = value;
        this.$percent()
        this._time = new Date().toTimeString()
    }

    get percent() {
        return this._percent
    }

    get max() {
        return this._max
    }

    get min() {
        return this._min
    }

    $percent() {
        if (this.open && this.close) {
            this._percent = twoDecimal(((this.close - this.open) / this.open) * 100)
            this.#max()
            this.#min()
        }
    }

    #max() {
        this._max = Math.max(this.percent, this._max)
    }

    #min() {
        if (this.percent === this.max) {
            if (this.min) {
                const minValue = twoDecimal(this.max - this.min)
                minValue > 1 && consola.info('min', this.symbol, minValue)
                const oldGrandMin = this._grandMin
                this._grandMin = Math.max(this._grandMin, minValue)
                if (oldGrandMin !== this._grandMin) {
                    saveGrandMin(this.symbol, this._grandMin)
                }
            }
            this._min = this.max
        } else {
            this._min = Math.min(this.percent, this._min)
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
            max && (this._max = max);
            min && (this._min = min)
        } else if (!(this.tradeStartedAtPercent && this.max)) {
            const error = new Error('cannot init trade')
            consola.error(error)
            throw error
        }
        this._stopLoss = this._stopLoss ? this._stopLoss : this.max - config.stop_lost;
        this._startTime = this._startTime ? this._startTime : new Date().toTimeString()
    }

    update({open, close, ...other}) {
        Object.assign(this, other)
        this.open = open
        this.close = close
        this._time = new Date().toTimeString()
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
        return this.percent<this.stopLoss
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
