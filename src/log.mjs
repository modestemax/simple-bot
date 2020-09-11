import fs from 'fs'

const FEE = 0.075

let stream, csvStream

const openStream = () => {
    if (!stream) {
        const file = `${process.env.HOME}/${global.config.instance_name}_${new Date().toDateString()}.html`
        stream = fs.createWriteStream(file, {flags: 'a'});
    }
    return stream
}

const openCsvStream = () => {
    if (!csvStream) {
        const file = `${process.env.HOME}/${global.config.instance_name}_${new Date().toDateString()}.csv`
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

export function logTradeStatus(currentTrade) {
     if (currentTrade) {
        let symbolResume = `${currentTrade.symbol}\tb:${currentTrade.bidPrice} (${currentTrade.tradeStartedAtPercent}%)\tc:${currentTrade.close} (${currentTrade.percent}%)`
        symbolResume += currentTrade.grandMin ? `\tm:${currentTrade.grandMin}` : ""
        const gain = (currentTrade.percent - currentTrade.tradeStartedAtPercent).toFixed(2)
        const status = +(gain > FEE)
        if (status) {
            symbolResume = `Take profit  ${gain}% : ${symbolResume}`
        } else {
            symbolResume = `Stop loss ${gain}% : ${symbolResume}`
        }
        const time = new Date().toLocaleTimeString()

        log(`<pre style="background-color:${status ? '#f0fff3' : '#e91e1e1a'}">${time} ${symbolResume} </pre>`)
        logTradeStatusCSV({status, symbol: currentTrade.symbol, percent: gain})
    }
}
