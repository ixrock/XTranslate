// Background page

import { onConnect, onMessage, MessageType } from '../extension'
import { getStore, AppState } from '../store'
import { updateContextMenu, bindContextMenu } from './contextMenu'
import { createStorage } from "../utils/createStorage";
import isEqual = require("lodash/isEqual");

// get current app state from storage
var appState: AppState = {};
getStore().then(store => {
  appState = store.getState();
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
    var showMenuChange = appState.settings.showInContextMenu !== state.settings.showInContextMenu;
    var favoritesChange = !isEqual(appState.favorites, state.favorites);
    appState = state;
    if (showMenuChange || favoritesChange) updateContextMenu(appState);
  }
});

// first installation
chrome.runtime.onInstalled.addListener(function (evt) {
  createStorage('installTime', Date.now());
});