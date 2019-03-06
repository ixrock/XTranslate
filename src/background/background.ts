// Background page

import "./contextMenu"
import { createTab, getOptionsPageUrl, MessageType, onMessage, PlayTextToSpeechPayload } from '../extension'
import { AppRoute } from "../components/app/app.route";
import { getTranslatorByName } from "../vendors";

// handle text-to-speech events from popup
onMessage(function (message) {
  var type = message.type;
  if (type === MessageType.PLAY_TEXT_TO_SPEECH) {
    let { vendor, text, lang } = message.payload as PlayTextToSpeechPayload;
    getTranslatorByName(vendor).playText(lang, text);
  }
  if (type === MessageType.STOP_TTS_PLAYING) {
    let vendor = message.payload;
    getTranslatorByName(vendor).stopPlaying();
  }
});

// open settings on install
chrome.runtime.onInstalled.addListener(function (evt) {
  if (evt.reason === "install") {
    createTab(getOptionsPageUrl(AppRoute.settings));
  }
});
