export function throttle(func, timeFrame) {
    let lastTime = 0;
    return function (...arg) {
        const now = new Date();
        if (now - lastTime >= timeFrame) {
            func(...arg);
            lastTime = now;
        }
    };
}