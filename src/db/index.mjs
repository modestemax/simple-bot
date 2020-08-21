import {Signal} from "./SignalClass.mjs";


export const cryptoMap = {}

export const first = new Signal({})

export const findFirst = (cryptoMap) => {
    const sortedList = Object.values(cryptoMap).filter(a => a.percent).sort((a, b) => a.percent < b.percent ? 1 : -1)
    Object.assign(first, sortedList[0])
    console.log(first, 'percent=', first.percent, 'max=', first.max)
    //todo doit on save le max? le first?
}


