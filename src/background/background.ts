// Background page

import { onConnect, onMessage, MessageType } from '../extension'
import { getStore, AppState } from '../store'
import { updateContextMenu } from './contextMenu'
import isEqual = require("lodash/isEqual");

// get current app state from storage
var appState: AppState = {};
getStore().then(store => {
  appState = store.getState();
  updateContextMenu(appState);
});

// send current app state to content page on request
onConnect(port => {
  port.postMessage({
    type: MessageType.APP_STATE,
    payload: appState
  });
});

// update app state from options page event
onMessage(function (message) {
  if (message.type === MessageType.APP_STATE_SYNC) {
    var state: AppState = message.payload;
    var showMenuChange = appState.settings.showContextMenu !== state.settings.showContextMenu;
    var favoritesChange = !isEqual(appState.favorites, state.favorites);
    appState = state;
    if (showMenuChange || favoritesChange) updateContextMenu(appState);
  }
});