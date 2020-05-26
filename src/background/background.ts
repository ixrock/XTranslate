//-- Background page script

// import "crx-hotreload"
import "./contextMenu"
import { Message, MessageType, onMessage, PlayTextToSpeechPayload, sendMessage, sendTabMessage, TranslatePayload, TranslatePayloadResult } from '../extension'
import { getTranslator, ITranslationResult, stopPlayingAll } from "../vendors";
import { rateLastTimestamp } from "../common";
import { settingsStore } from "../components/settings/settings.store";
import { userHistoryStore } from "../components/user-history/user-history.store";
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
  var { type, payload, id: msgId } = message;
  switch (type) {
    case MessageType.TRANSLATE_TEXT:
      var { vendor, from, to, text } = payload as TranslatePayload;

      // handle translation requests here due CORB/CORS blocking (from content page script)
      var response = await getTranslator(vendor).getTranslation(from, to, text)
        .then(onTranslationReady)
        .then(data => ({ data }))
        .catch(error => ({ error }));

      var result: Message<TranslatePayloadResult> = {
        id: msgId,
        type: type,
        payload: response
      };

      // send translation result back
      if (sender.tab) sendTabMessage(sender.tab.id, result);
      else sendMessage(result); // browser action window (popup)
      break;

    case MessageType.TTS_PLAY:
      playText(payload);
      break;

    case MessageType.TTS_STOP:
      stopPlayingAll();
      break;
  }
});

function playText(payload: PlayTextToSpeechPayload) {
  var { vendor, text, lang } = payload;
  getTranslator(vendor).playText(lang, text);
}

function onTranslationReady(translation: ITranslationResult) {
  var { autoPlayText, historyEnabled } = settingsStore.data;
  if (autoPlayText) {
    let { vendor, originalText, langFrom, langDetected = langFrom } = translation;
    playText({ vendor, text: originalText, lang: langDetected })
  }
  if (historyEnabled) {
    userHistoryStore.saveTranslation(translation);
  }
  return translation;
}
