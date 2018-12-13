// Background page

import { MessageType, onConnect, onMessage, openOptionsPage, PlayTextToSpeechPayload } from '../extension'
import { bindContextMenu, updateContextMenu } from './contextMenu'
import { getVendor } from "../vendors";
import { initAppState, loadAppState, store } from "../store/store";
import { IAppState } from "../store/store.types";
import isEqual = require("lodash/isEqual");

loadAppState().then(updateContextMenu);
bindContextMenu();

// send current app state to content page on connect
onConnect(port => {
  port.postMessage({
    type: MessageType.APP_STATE,
    payload: store.getState()
  });
});

// update app state from options page and handle play/stop tts from popup
onMessage(function (message) {
  var type = message.type;
  if (type === MessageType.APP_STATE) {
    var oldState = store.getState();
    var newState: IAppState = message.payload;
    initAppState(newState); // sync state on change from options page

    var showMenuChange = oldState.settings.showInContextMenu !== newState.settings.showInContextMenu;
    var favoritesChange = !isEqual(oldState.favorites, newState.favorites);
    if (showMenuChange || favoritesChange) updateContextMenu();
  }
  if (type === MessageType.PLAY_TEXT_TO_SPEECH) {
    let { vendor, text, lang } = message.payload as PlayTextToSpeechPayload;
    getVendor(vendor).playText(lang, text);
  }
  if (type === MessageType.STOP_TTS_PLAYING) {
    let vendor = message.payload;
    getVendor(vendor).stopPlaying();
  }
});

// manage install and update events
chrome.runtime.onInstalled.addListener(function (evt) {
  if (evt.reason === "install") {
    openOptionsPage("#settings");
  }
});
