export function debounce(callback, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => {
            timer = undefined;
            callback.apply(this, args);
        }, delay);
    };
}
