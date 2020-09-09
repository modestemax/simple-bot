import fs from 'fs'

const FEE = 0.075

let stream, csvStream

const openStream = () => {
    if (!stream) {
        const file = `${process.env.HOME}/${global.config.timeframe}_${new Date().toDateString()}.html`
        stream = fs.createWriteStream(file, {flags: 'a'});
    }
    return stream
}

const openCsvStream = () => {
    if (!csvStream) {
        const file = `${process.env.HOME}/${global.config.timeframe}_${new Date().toDateString()}.csv`
        if (!fs.existsSync(file)) {
            csvStream = fs.createWriteStream(file, {flags: 'a'});
            csvStream.write(`status,symbol,percent\n`)
        } else {
            csvStream = fs.createWriteStream(file, {flags: 'a'});
        }
    }
    return csvStream
}


export function endStream() {
    return new Promise(resolve => {
        openStream().end(() => openCsvStream().end(resolve))
    })
}

export function log(text) {
    const stream = openStream()
    if (!/^<pre/i.test(text)) {
        text = `<pre>${text}</pre>`
    }
    stream.write(text + "\n");
    console.log(text)
}

function logTradeStatusCSV({status, symbol, percent}) {
    const stream = openCsvStream()
    stream.write(`${status},${symbol},${percent}\n`);
}

export function logTrade({side, symbol, cryptoMap}) {
    const signal = cryptoMap[symbol.toLowerCase()]
    const time = new Date().toLocaleTimeString()
    log(`<pre style="color: ${side.toUpperCase() === 'BUY' ? 'green' : 'red'}">${time} ${side}\t${symbol}\t${signal.close}\t${signal.percent}%</pre>`)


}

export function logApiError(text) {
    const time = new Date().toLocaleTimeString()
    log(`<pre style="background-color: grey">${time} ${text}</pre>`)
}

export function logLost(text) {
    const time = new Date().toLocaleTimeString()
    log(`<pre style="background-color:#e91e1e1a ">${time} ${text} </pre>`)
}

export function logTradeStatus(currentTrade) {
    if (currentTrade) {
        let symbolResume = `${currentTrade.symbol}\tb:${currentTrade.bidPrice} (${currentTrade.tradeStartedAtPercent}%)\tc:${currentTrade.close} (${currentTrade.percent}%)`
        symbolResume += currentTrade.grandMin ? `\tm:${currentTrade.grandMin}` : ""
        const gain = (currentTrade.percent - currentTrade.tradeStartedAtPercent).toFixed(2)
        if (gain <= FEE) {
            symbolResume = `Stop loss ${gain}% : ${symbolResume}`
        } else {
            symbolResume = `Take profit  ${gain}% : ${symbolResume}`
        }
        const time = new Date().toLocaleTimeString()
        log(`<pre style="background-color:#f0fff3 ">${time} ${symbolResume} </pre>`)
        logTradeStatusCSV({status: +(gain > FEE), symbol: currentTrade.symbol, percent: gain})
    }
}

export function addPercent({close, percent}) {
    return +(close * (1 + percent / 100)).toFixed(8)
}
