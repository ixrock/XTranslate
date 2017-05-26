import { applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'
import omit = require('lodash/omit');

/**
 * Logs all actions after they are dispatched
 */
const loggerMiddleware = store => next => action => {
  if (action.type && !action.promise && !action.silent) {
    var type = action.type.toString();
    var textStyle = 'font-weight: bold;';
    if (action.data) textStyle += 'background: green; color: white';
    if (action.error) textStyle += 'background: red; color: white';
    console.log('%c' + type, textStyle, omit(action, 'type'));
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

interface PromisedAction {
  type: string
  promise: Promise<any>
}

/**
 * Dispatch actions with promises
 */
const promisedMiddleware = store => next => (action: PromisedAction|any) => {
  var promise = action.promise;
  if (promise) {
    var promisedAction = omit(action, ["promise"]);
    store.dispatch(promisedAction);
    return promise
        .then(data => {
          store.dispatch(Object.assign(promisedAction, { data }));
          return data;
        })
        .catch(error => {
          store.dispatch(Object.assign(promisedAction, { error }));
          throw error;
        });
  }
  return next(action);
};

export const middlewares = applyMiddleware(...[
  thunkMiddleware,
  loggerMiddleware,
  promisedMiddleware,
  vanillaPromise
]);
