import fs from 'fs'
import sendMessage, {editMessageText} from './telegram.mjs'


const FEE = 0.075

let stream, csvStream, errStream

const getFile = (ext) => {

    const date = new Date().toISOString().split('T')[0] + ' ' + new Date().toDateString().split(' ')[0]
    const file = `${process.env.HOME}/${date}/${global.config.instance_name}.` + ext
    let dir = file.split('/')
    dir.pop()
    dir = dir.join('/')
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    return file
}
const openStream = () => {
    if (!stream) {
        const file = getFile(`html`)
        stream = fs.createWriteStream(file, {flags: 'a'});
    }
    return stream
}
const openErrorStream = () => {
    if (!errStream) {
        const file = getFile(`error.txt`)
        errStream = fs.createWriteStream(file, {flags: 'a'});
    }
    return errStream
}

const openCsvStream = () => {
    if (!csvStream) {
        const file = getFile(`csv`)
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
    sendMessage(text)
}

function logTradeStatusCSV({status, symbol, percent}) {
    const stream = openCsvStream()
    stream.write(`${status},${symbol},${percent}\n`);
}

export function logTrade({side, symbol, cryptoMap}) {
    const signal = cryptoMap[symbol.toLowerCase()]
    const time = new Date().toLocaleTimeString()
    log(`<pre style="color: ${side.toUpperCase() === 'BUY' ? 'green' : 'red'}">${time} ${side}\t${symbol}\t${signal?.close}\t${signal?.percent}%</pre>`)


}

export function logError(text) {
    const time = new Date().toLocaleTimeString()
    const stream = openErrorStream()

    stream.write(time + '\n' + text + "\n");
    console.error(text)
    sendMessage(text)
}

export function logTradeStatus(currentTrade) {
    if (currentTrade) {
        let symbolResume = `${currentTrade.symbol}\tb:${currentTrade.bidPrice} (${currentTrade.tradeStartedAtPercent}%)\tc:${currentTrade.close} (${currentTrade.percent}%) \tpick:${currentTrade.pick} `
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

let t = Date.now()

export function logTradeProgress(trade) {
    if (Date.now() - t > 60e3)
        process.nextTick(async () => {
            t = Date.now()
            const message_id = trade.message_id
            const transmitMessage = message_id ? editMessageText : sendMessage
            let message = await transmitMessage({text: `Trade #${trade.symbol} ${trade.change?.toFixed(2)}%`, message_id})
            trade.message_id ||  (trade.message_id = message?.message_id)
        })
}
