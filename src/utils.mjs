import fs from 'fs'

export function throttle(func, timeFrame) {
    let lastTime = 0;
    return function (...arg) {
        const now = new Date();
        if (now - lastTime >= timeFrame) {
            func(...arg);
            lastTime = now;
        }
    };
}

export function noop() {
// debugger
}
export function log() {

}



export function logTrade({side, symbol, cryptoMap}) {
    const file = `${process.env.HOME}/${global.config.timeframe}_${new Date().toDateString()}.txt`

    const stream = fs.createWriteStream(file, {flags: 'a'});
    const signal = cryptoMap[symbol.toLowerCase()]
    stream.write(`${side}\t${symbol}\t${signal.close}\t${signal.percent}%` + "\n");

}

export function logApiError(text) {
    const file = `${process.env.HOME}/${global.config.timeframe}_${new Date().toDateString()}.txt`

    const stream = fs.createWriteStream(file, {flags: 'a'});
    stream.write(text + "\n");

}