import { createStore, Store } from 'redux'
import { middlewares, rootReducer, AppState } from './index'
import { Storage, broadcastMessage, MessageType, getBgcPage } from '../extension'
import isEqual = require("lodash/isEqual");
import cloneDeep = require("lodash/cloneDeep");

var appState: AppState = {};
interface AppStore extends Store<AppState> {
}

export var store: AppStore;
export const storage = new Storage<AppState>();

export function getStore(): Promise<AppStore> {
  return storage.sync.get().then(initState => {
    store = createStore(rootReducer, initState || {}, middlewares);
    appState = cloneDeep(store.getState());
    getBgcPage().then(bgcPage => {
      if (window !== bgcPage) store.subscribe(syncState);
    });
    return store;
  });
}

function syncState() {
  var state = store.getState();
  if (!isEqual(appState, state)) {
    appState = cloneDeep(state);
    broadcastMessage({
      type: MessageType.APP_STATE,
      payload: appState
    });
  }
}