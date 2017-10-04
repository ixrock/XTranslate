import thunkMiddleware from 'redux-thunk'
import { Action } from "../utils/commonReducer";

/**
 * Logs all actions after they are dispatched
 */
const loggerMiddleware = store => next => (action: Action) => {
  if (action.type && !action.promise && !action.silent) {
    var {type, ...actionParams} = action;
    var textStyle = 'font-weight: bold;';
    if (action.data) textStyle += 'background: green; color: white';
    if (action.error) textStyle += 'background: red; color: white';
    console.log('%c' + type.toString(), textStyle, actionParams);
  }
  return next(action);
};

/**
 * Lets you dispatch promises in addition to actions.
 * If the promise is resolved, its result will be dispatched as an action.
 * The promise is returned from `dispatch` so the caller may handle rejection.
 */
const vanillaPromise = store => next => action => {
  if (typeof action.then === 'function') {
    return action.then(store.dispatch);
  }
  return next(action);
};

/**
 * Dispatch actions with promises
 */
const promisedMiddleware = store => next => (action: Action) => {
  if (action.promise) {
    var { promise, ...actionParams } = action;
    store.dispatch({ ...actionParams, waiting: true });
    return promise
      .then(data => {
        store.dispatch({ ...actionParams, data });
        return data;
      })
      .catch(error => {
        store.dispatch({ ...actionParams, error });
        throw error;
      });
  }
  return next(action);
};

export const middlewares = [
  thunkMiddleware,
  loggerMiddleware,
  promisedMiddleware,
  vanillaPromise
];
