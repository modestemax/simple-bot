
export class Signal {
    symbol;
    open;
    close;
    #max = 0;

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
}


