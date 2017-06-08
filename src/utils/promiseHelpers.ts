// Helpers for ES5 promises

interface DebouncePromise<P = (...params) => Promise<any>> {
  (promisedFunc: P, timeout?: number): P
}

export const debouncePromise: DebouncePromise = function (promisedFunc, timeout = 0) {
  var timer;
  return (...params) => new Promise((resolve, reject) => {
    clearTimeout(timer);
    timer = setTimeout(() => resolve(promisedFunc.apply(this, params)), timeout);
  });
};
