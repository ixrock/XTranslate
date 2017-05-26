// Helper for auto-binding redux store dispatcher to action creators
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
