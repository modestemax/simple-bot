import {config} from './firestore.mjs';


export class Signal {
    symbol;
    open;
    close;
    #max = -Infinity;
    #min = Infinity;
    $tradeStartedAtPercent;

    get tradeStartedAtPercent() {
        return this.$tradeStartedAtPercent
    };

    set tradeStartedAtPercent(value) {
        this.$tradeStartedAtPercent = value
    };

    constructor({symbol, open}) {
        this.symbol = symbol
        this.open = +open
    }


    $percent;

    get percent() {
        let percent = 0
        if (this.open && this.close) {
            percent = (((this.close - this.open) / this.open) * 100)
            percent = Math.trunc(percent * 100) / 100
        }
        return this.$percent = this.$percent = percent
    }

    $max;

    get max() {
        return this.$max = this.#max = Math.max(this.percent, this.#max)
    }

    $min;

    get min() {
        if (this.max >= config.enter_trade /*&& this.max <= enterTrade + takeProfit*/) {
            this.#min = Math.min(this.percent, this.#min)
        }
        return this.$min = this.#min
    }

    tradeStarted() {
        this.tradeStartedAtPercent = this.percent
    }

    isBelowStopLoss() {
        return this.tradeStartedAtPercent - this.percent >= config.stop_lost
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


class Trade extends Signal{

}
