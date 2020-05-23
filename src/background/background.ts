//-- Background page script

// import "crx-hotreload"
import "./contextMenu"
import { Message, MessageType, onMessage, PlayTextToSpeechPayload, sendTabMessage, TranslatePayload, TranslatePayloadResult } from '../extension'
import { getTranslator, stopPlayingAll } from "../vendors";
import { rateLastTimestamp } from "../common";
import { AppPageId, openAppTab } from "../navigation";

// open settings on install
chrome.runtime.onInstalled.addListener(function (evt) {
  if (evt.reason === "install") {
    rateLastTimestamp.set(Date.now());
    openAppTab(AppPageId.settings);
  }
});

// handle events from content page
onMessage(async (message: Message, sender) => {
  var { type, payload } = message;
  switch (type) {
    case MessageType.TRANSLATE_TEXT:
      var { vendor, from, to, text } = payload as TranslatePayload;

      // handle translation requests here due CORB/CORS blocking (from content page script)
      var response = await getTranslator(vendor).getTranslation(from, to, text)
        .then(data => ({ data }))
        .catch(error => ({ error }));

      // send translation result back
      sendTabMessage<TranslatePayloadResult>(sender.tab.id, {
        type: type,
        payload: response
      });
      break;

    case MessageType.PLAY_TEXT_TO_SPEECH:
      var { vendor, text, lang } = payload as PlayTextToSpeechPayload;
      getTranslator(vendor).playText(lang, text);
      break;

    case MessageType.STOP_TTS_PLAYING:
      stopPlayingAll();
      break;
  }
});
