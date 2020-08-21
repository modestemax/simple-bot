const ENTER_TRADE = 38;
const TAKE_PROFIT = 1;

export class Signal {
    symbol;
    open;
    close;
    #max = -Infinity;
    #min = Infinity;

    constructor({symbol, open}) {
        this.symbol = symbol
        this.open = +open
    }

    get percent() {
        const percent = (((this.close - this.open) / this.open) * 100)
        return Math.trunc(percent * 100) / 100
    }

    get max() {
        return this.#max = Math.max(this.percent, this.#max)
    }

    get min() {
        if (this.max >= ENTER_TRADE /*&& this.max <= enterTrade + takeProfit*/) {
            this.#min = Math.min(this.percent, this.#min)
        }
        return this.#min
    }
}


