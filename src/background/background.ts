// Background page

import { onConnect, onMessage, MessageType, openOptionsPage, PlayTextToSpeechPayload } from '../extension'
import { checkLicense } from "../extension/license";
import { getStore, AppState } from '../store'
import { updateContextMenu, bindContextMenu } from './contextMenu'
import { vendors } from "../vendors";
import isEqual = require("lodash/isEqual");

var appState: AppState = {};
getStore().then(store => {
  appState = store.getState();
  updateContextMenu(appState);
});

// add context menu event handler
bindContextMenu(() => appState);

// send current app and license state to content page on connect
onConnect(port => {
  port.postMessage({
    type: MessageType.APP_STATE,
    payload: appState
  });
  var hasLicense = function (hasLicense: boolean) {
    port.postMessage({
      type: MessageType.LICENSE_STATE,
      payload: hasLicense
    });
  };
  checkLicense(appState.settings.allowAds)
      .then(() => hasLicense(true))
      .catch(() => hasLicense(false));
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
  }
});