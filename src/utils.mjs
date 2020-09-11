export const ONE_SECOND = 1e3
export const ONE_MINUTE = ONE_SECOND * 60
export const SATOSHI = 1e-8


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
//     console.log('beat')
}


export function addPercent({close, percent}) {
    return +(close * (1 + percent / 100)).toFixed(8)
}

