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

const openStream = () => {
    const file = `${process.env.HOME}/${global.config.timeframe}_${new Date().toDateString()}.txt`
    return fs.createWriteStream(file, {flags: 'a'});
}
let stream

export function log(text) {
    stream = stream || openStream()
    stream.write(text + "\n");
    console.log(new Date().toLocaleTimeString() + ' ' + text)
}


export function logTrade({side, symbol, cryptoMap}) {
    const signal = cryptoMap[symbol.toLowerCase()]
    log(`${side}\t${symbol}\t${signal.close}\t${signal.percent}%`)


}

export function logApiError(text) {
    log(text)
}