//-- Background page script

// import "crx-hotreload"
import "./contextMenu"
import { HistorySearchPayload, Message, MessageType, onMessage, PlayTextToSpeechPayload, TranslatePayload, TranslatePayloadResult } from '../extension'
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

    case MessageType.SEARCH_IN_HISTORY:
      await userHistoryStore.load();
      var { query } = payload as HistorySearchPayload;
      var items = userHistoryStore.searchItems(query);
      sendResponse(items);
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
}
