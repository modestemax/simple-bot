import fetchJson from 'fetch-json'
import   {cryptoMap} from './db/index.mjs' ;
import   {Signal} from './db/SignalClass.mjs' ;

const fetch=fetchJson.post

const url =   "https://scanner.tradingview.com/crypto/scan"




const handleTradingViewData = ({data}) =>{

  Object.assign(cryptoMap,data.reduce((map,{d})=>({...map,[d[12].toLowerCase()]: new Signal({symbol:d[12].toLowerCase(),open:d[10]})}), {}))

   console.log(cryptoMap)
}




function  init(){

    const DAY=1e3*60*60*24
    const time=Date.now()
    const midnight=time-(time%DAY)
    const nextMinight=midnight+DAY;
    setTimeout(init,nextMinight-time);
    fetch("https://scanner.tradingview.com/crypto/scan",
        {"filter":[{"left":"change","operation":"nempty"},{"left":"exchange","operation":"equal","right":"BINANCE"},{"left":"name,description","operation":"match","right":"btc$"}],"options":{"lang":"en"},"symbols":{"query":{"types":[]},"tickers":[]},"columns":["currency_logoid","name","close","change","change_abs","high","low","volume","Recommend.All","exchange","open","description","name","type","subtype","update_mode","pricescale","minmov","fractional","minmove2"],"sort":{"sortBy":"change","sortOrder":"desc"},"range":[0,200]},
    ).then(handleTradingViewData);
}

export const initTradingView=init;