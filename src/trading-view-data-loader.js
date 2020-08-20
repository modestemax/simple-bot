const fetchJson = require('/usr/local/lib/node_modules/fetch-json');
const url =   "https://scanner.tradingview.com/crypto/scan"
const fetch=fetchJson.post
let cryptoMap;
class Signal{
	//symbol;
	//open;
	//close;
	constructor({symbol,open}){
		this.symbol=symbol
		this.open=+open		
	}
	get percent(){
		const percent=(((this.close-this.open)/this.open)*100)
		return Math.trunc(percent*100)/100 
	}
}

const handleTradingViewData = ({data}) =>{
	
   cryptoMap=data.reduce( 
   		(map,{d})=>({
	   				...map,
	   				[d[12].toLowerCase()]: new Signal({symbol:d[12].toLowerCase(),open:d[10]})
   				}), {})

   console.log(cryptoMap)
}


const handleTicker = ({data}) =>{
   if(cryptoMap){
   		JSON.parse(data).map(e=>{
   			let crypto=cryptoMap[e.s.toLowerCase()]
   			if (crypto) {
   				crypto.close=+e.c
   			}
   		})
   console.log(cryptoMap)
   getFirst(cryptoMap)
   }
}

const getFirst=(cryptoMap)=>{
	const sortedList=Object.values(cryptoMap).sort((a,b)=>a>b?1:-1)
	const first=sortedList[0]
	console.log(first,first.percent)
	return first
}

fetch("https://scanner.tradingview.com/crypto/scan",  
  {"filter":[{"left":"change","operation":"nempty"},{"left":"exchange","operation":"equal","right":"BINANCE"},{"left":"name,description","operation":"match","right":"btc$"}],"options":{"lang":"en"},"symbols":{"query":{"types":[]},"tickers":[]},"columns":["currency_logoid","name","close","change","change_abs","high","low","volume","Recommend.All","exchange","open","description","name","type","subtype","update_mode","pricescale","minmov","fractional","minmove2"],"sort":{"sortBy":"change","sortOrder":"desc"},"range":[0,200]},
).then(handleTradingViewData);


const WebSocket = require('/usr/local/lib/node_modules/ws');

w=new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr')
w.onmessage=handleTicker
//w.close()