import fs from 'fs'

export const ONE_MINUTE = 1e3 * 60 * 10

export function throttle(func, timeFrame = ONE_MINUTE) {
    return throttleWithCondition(() => false, func, timeFrame)
}

export function throttleWithCondition(cond, func, timeFrame = ONE_MINUTE) {
    let lastTime = 0;
    return function (...arg) {
        const now = new Date();
        if (cond() || now - lastTime >= timeFrame) {
            func(...arg);
            lastTime = now;
        }
    };
}

export function noop() {
// debugger
}

const openStream = () => {
    const file = `${process.env.HOME}/${global.config.timeframe}_${new Date().toDateString()}.html`
    return fs.createWriteStream(file, {flags: 'a'});
}
let stream

export function endStream() {
    return new Promise(resolve => {
        stream ? stream.end(resolve) : resolve()
    })
}

export function log(text) {
    stream = stream || openStream()
    text = new Date().toLocaleTimeString() + ' ' + text
    stream.write(text + "\n");
    console.log(text)
}


export function logTrade({side, symbol, cryptoMap}) {
    const signal = cryptoMap[symbol.toLowerCase()]
    log(`${side}\t${symbol}\t${signal.close}\t${signal.percent}%`)


}

export function logApiError(text) {
    log(`<pre style="background-color: red">${text}</pre>`)
}
export function logLost(text) {
    log(`<pre style="color: red">${text} </pre>`)
}
export function logProfit(text) {
    log(`<pre style="color: green">${text} </pre>`)
}

export function addPercent({close, percent}) {
    return +(close * (1 + percent / 100)).toFixed(8)
}