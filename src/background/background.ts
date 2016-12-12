// Background page

import { onConnect, onMessage, MessageType } from '../extension'
import { getStore, AppState } from '../store'
import { updateContextMenu, bindContextMenu } from './contextMenu'
import isEqual = require("lodash/isEqual");
import merge = require("lodash/merge");

// get current app state from storage
var appState: AppState = {};
getStore().then(store => {
  merge(appState, store.getState());
  updateContextMenu(appState);
});

// add context menu event handler
bindContextMenu(() => appState);

// send current app state to content page on connect
onConnect(port => {
  port.postMessage({
    type: MessageType.APP_STATE,
    payload: appState
  });
});

// update app state from options page event
onMessage(function (message) {
  if (message.type === MessageType.APP_STATE) {
    var state: AppState = message.payload;
    var showMenuChange = appState.settings.showContextMenu !== state.settings.showContextMenu;
    var favoritesChange = !isEqual(appState.favorites, state.favorites);
    merge(appState, state);
    if (showMenuChange || favoritesChange) updateContextMenu(appState);
  }
});