export const cryptoMap={}

export let firstChanged=()=>{}
export class Signal{
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

export const first=new Signal({})

export const findFirst=(cryptoMap)=>{
	const sortedList=Object.values(cryptoMap).filter(a=>a.percent).sort((a,b)=>a.percent<b.percent?1:-1)
	Object.assign(first, sortedList[0])
	console.log(first,first.percent)
}
