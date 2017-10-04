// Common wrapper for all reducers
const cloneDeep = require('lodash/cloneDeep');
const isEqual = require('lodash/isEqual');

export interface Action<D = any> {
  type?: any
  data?: D
  error?: any
  waiting?: boolean
  silent?: boolean
  promise?: Promise<any>
  [param: string]: any
}

export function commonReducer<S>(initState: S, modifyStore: (state: S, action: Action) => any) {
  return function (state = initState, action) {
    var stateCopy = cloneDeep(state || {});
    var result = modifyStore(stateCopy, action);
    if (result) return result;
    return isEqual(state, stateCopy) ? state : stateCopy;
  };
}
