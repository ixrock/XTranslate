//-- Background page

import "./contextMenu"
import "crx-hotreload"
import { createTab, getOptionsPageUrl, Message, MessageType, onMessage, PlayTextToSpeechPayload } from '../extension'
import { AppRoute } from "../components/app/app.route";
import { getTranslator, stopPlayingAll } from "../vendors";

// open settings on install
chrome.runtime.onInstalled.addListener(function (evt) {
  if (evt.reason === "install") {
    createTab(getOptionsPageUrl(AppRoute.settings));
  }
});

// handle events from content page
onMessage((message: Message) => {
  var { type, payload } = message;
  switch (type) {
    case MessageType.PLAY_TEXT_TO_SPEECH:
      let { vendor, text, lang } = payload as PlayTextToSpeechPayload;
      getTranslator(vendor).playText(lang, text);
      break;

    case MessageType.STOP_TTS_PLAYING:
      stopPlayingAll();
      break;
  }
});
