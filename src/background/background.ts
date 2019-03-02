// Background page

import "./contextMenu"
import { createTab, getOptionsPageUrl, MessageType, onMessage, PlayTextToSpeechPayload } from '../extension'
import { getVendorByName } from "../vendors";
import { AppRoute } from "../components/app/app.route";

// handle text-to-speech events from popup
onMessage(function (message) {
  var type = message.type;
  if (type === MessageType.PLAY_TEXT_TO_SPEECH) {
    let { vendor, text, lang } = message.payload as PlayTextToSpeechPayload;
    getVendorByName(vendor).playText(lang, text);
  }
  if (type === MessageType.STOP_TTS_PLAYING) {
    let vendor = message.payload;
    getVendorByName(vendor).stopPlaying();
  }
});

// open settings on install
chrome.runtime.onInstalled.addListener(function (evt) {
  if (evt.reason === "install") {
    createTab(getOptionsPageUrl(AppRoute.settings));
  }
});
