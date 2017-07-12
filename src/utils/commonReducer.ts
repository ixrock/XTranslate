// Common wrapper for all reducers
const cloneDeep = require('lodash/cloneDeep');

interface Action {
  type?: any
  data?: any
  error?: any
  waiting?: boolean
  [param: string]: any
}

export function commonReducer<S>(initState: S, modifyStore: (state: S, action: Action) => any) {
  return function (state = initState, action) {
    state = cloneDeep(state || {});
    Object.defineProperty(action, "waiting", {
      enumerable: false,
      writable: true,
      value: !action.data && !action.error
    });
    var result = modifyStore(state, action);
    return result ? result : state;
  };
}
