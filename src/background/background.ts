//-- Background page (main process)

// import "crx-hotreload"
import "./contextMenu"
import { Message, MessageType, onMessage, PlayTextToSpeechPayload, TranslatePayload, TranslatePayloadResult } from '../extension'
import { getTranslator, ITranslationResult, stopPlayingAll } from "../vendors";
import { rateLastTimestamp } from "../components/app/app-rate.dialog";
import { settingsStore } from "../components/settings/settings.storage";
import { historyStore } from "../components/user-history/history.storage";
import { defaultPageId, navigate } from "../navigation";

// FIXME: check stores data sync (bgc <-> options-page <-> user-script)
// FIXME: switching translation vendor after invalid response from current is failed
// TODO: group same input translations with different vendors
// TODO: check import/export history dialog in brave browser in app's browser-icon window

// open settings on install
chrome.runtime.onInstalled.addListener(function (evt) {
  if (evt.reason === "install") {
    rateLastTimestamp.set(Date.now());
    navigate({ page: defaultPageId }).catch(Function);
  }
});

// handle ipc messages
onMessage(async (message: Message, sender, sendResponse) => {
  var { type, payload } = message;
  switch (type) {
    case MessageType.TRANSLATE_TEXT:
      var { vendor, from, to, text } = payload as TranslatePayload;
      var req = getTranslator(vendor).getTranslation(from, to, text);
      req.then(onTranslationReady);

      sendResponse<TranslatePayloadResult>(
        await req
          .then(data => ({ data }))
          .catch(error => ({ error }))
      );
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
    historyStore.saveTranslation(translation);
  }
}
