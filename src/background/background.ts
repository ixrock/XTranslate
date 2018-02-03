// Background page

import { MessageType, onConnect, onMessage, openOptionsPage, PlayTextToSpeechPayload } from '../extension'
import { AppState, getStore, storage } from '../store'
import { bindContextMenu, updateContextMenu } from './contextMenu'
import { vendors } from "../vendors";
import isEqual = require("lodash/isEqual");

var appState: AppState = {};
var storeInit = getStore().then(store => {
  appState = store.getState();
  updateContextMenu(appState);
  return appState;
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

// update app state from options page and handle play/stop tts from popup
onMessage(function (message) {
  var type = message.type;
  if (type === MessageType.APP_STATE) {
    var state: AppState = message.payload;
    var showMenuChange = appState.settings.showInContextMenu !== state.settings.showInContextMenu;
    var favoritesChange = !isEqual(appState.favorites, state.favorites);
    appState = state;
    if (showMenuChange || favoritesChange) updateContextMenu(appState);
  }
  if (type === MessageType.PLAY_TEXT_TO_SPEECH) {
    let { vendor, text, lang } = message.payload as PlayTextToSpeechPayload;
    vendors[vendor].playText(lang, text);
  }
  if (type === MessageType.STOP_TTS_PLAYING) {
    let vendor = message.payload;
    vendors[vendor].stopPlaying();
  }
});

// manage install and update events
chrome.runtime.onInstalled.addListener(function (evt) {
  if (evt.reason === "install") {
    openOptionsPage("#settings");
    storeInit.then(storage.sync.set);
  }
});

try {
  require("./refs");
} catch {}
