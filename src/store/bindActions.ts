import { bindActionCreators } from 'redux'
import { store } from './store'

// Class decorator for auto-wrapping redux action creators with the store's dispatcher
export function bindActions(constructor: Function) {
  var actions = constructor.prototype;

  var actionNames = Object.getOwnPropertyNames(actions).filter(name => name !== "constructor");
  actionNames.forEach(function (type) {
    var bindedAction;
    var actionCreator = actions[type];
    actions[type] = function (...args) {
      if (!bindedAction) bindedAction = bindActionCreators(actionCreator, store.dispatch as any);
      return bindedAction(...args);
    };
  });
}

// Base class for action creators, allows to pipe/chain multiple action creators
export class ActionsDispatcher {
  dispatch(...actionCreators) {
    actionCreators = [].concat(actionCreators);
    var promise = actionCreators.shift()();
    if (!(promise instanceof Promise)) promise = promise.promise || Promise.resolve(promise);

    actionCreators.forEach(function (action) {
      promise = promise.then(function (data) {
        if (typeof action === 'function') action = action(data);
        store.dispatch(action);
        return action.promise || action;
      });
    });

    return promise;
  }
}