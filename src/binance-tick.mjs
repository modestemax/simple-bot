import  WebSocket from 'ws';
import   {cryptoMap,findFirst} from './db/index.mjs' ;

const handleTicker = ({data}) =>{
   if(cryptoMap){
   		JSON.parse(data).map(e=>{
   			let crypto=cryptoMap[e.s.toLowerCase()]
   			if (crypto) {
   				crypto.close=+e.c
   			}
   		})
   console.log(cryptoMap)
   findFirst(cryptoMap)
   }
}



const ws=new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr')
ws.onmessage=handleTicker
//w.close()