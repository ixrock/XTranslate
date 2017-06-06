// Helpers for auto-dispatching redux actions
import { ActionCreatorsMapObject } from "redux";
import { store } from "./store";

export function bindActions<T extends ActionCreatorsMapObject>(actions: T): T {
  return Object.keys(actions).reduce((bindedActions, action) => {
    bindedActions[action] = function (...args) {
      var actionCreator = actions[action];
      return store.dispatch(actionCreator(...args));
    };
    return bindedActions;
  }, {} as T);
}

// Class decorator
export function bindClassActions(constructor: Function) {
  var proto = constructor.prototype;
  Object.keys(proto)
    .filter(action => action !== "constructor")
    .forEach(action => {
      var actionCreator: Function = proto[action];
      proto[action] = function (...args) {
        var action = actionCreator.apply(this, args);
        return store.dispatch(action);
      };
    })
}
