// Common wrapper for all reducers
const clone = require('lodash/clone');

export function commonReducer<S>(initState: S, modifyStore: (state: S, action) => any) {
  return function (state = initState, action) {
    state = clone(state || {});
    action = Object.create(action, {
      waiting: {
        get() {
          return !action.data && !action.error;
        }
      }
    });
    var actionResult = modifyStore(state, action);
    return actionResult || Object.assign({}, initState, state);
  };
}

export default commonReducer;