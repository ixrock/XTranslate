import { applyMiddleware, createStore, Store } from 'redux'
import { broadcastMessage, getBgcPage, MessageType } from '../extension'
import { appReducer } from "./app.reducer";
import { IAppState } from "./store.types";
import { middlewares } from "./middlewares";
import { storage } from "./storage";

export const store: Store<IAppState> = createStore(
  appReducer, {}, applyMiddleware(...middlewares)
);

// load app state from chrome storage
export function loadAppState() {
  return storage.sync.get().then(initAppState);
}

// dispatch whole new app state
export function initAppState(state: IAppState) {
  var appState = store.getState();
  store.dispatch({
    type: "APP_STATE_INIT",
    initState: Object.assign({}, appState, state),
  });
}

// sync app state on changes from options page with background and content pages
getBgcPage().then(bgcPage => {
  if (window !== bgcPage) {
    store.subscribe(() => {
      broadcastMessage({
        type: MessageType.APP_STATE,
        payload: store.getState()
      })
    });
  }
});
