//-- Background page (service-worker)

import "../packages.setup";
import "./contextMenu"
import { isDevelopment } from "../common-vars";
import { MessageType, onInstall, onMessageType, PlayTextToSpeechPayload, TranslatePayload, TranslatePayloadResult } from '../extension'
import { getTranslator, ITranslationResult, playText, stopPlayingAll } from "../vendors";
import { rateLastTimestamp } from "../components/app/app-rate.dialog";
import { settingsStore } from "../components/settings/settings.storage";
import { importHistory, loadHistory } from "../components/user-history/history.storage";
import { defaultPageId, navigate } from "../navigation";

// FIXME: text-to-speech is broken (google/manifest v3)
// TODO: deepl: allow to enter own auth-key
// TODO: calculate allowed text buffer for translation input in bytes
// TODO: allow to use custom fonts
// TODO: add multi language/vendor selector + remove favorites (broken atm)

onInstall(reason => {
  if (reason === "install" || isDevelopment) {
    rateLastTimestamp.set(Date.now());
    navigate({ page: defaultPageId });
  }
});

// Handle IPC for background process <-> options-page <-> content-script (browser pages)
onMessageType<TranslatePayload>(MessageType.TRANSLATE_TEXT, async (message, sender, sendResponse) => {
  try {
    const { vendor, from, to, text } = message.payload;
    const translation: ITranslationResult = await getTranslator(vendor).getTranslation(from, to, text);
    const { autoPlayText, historyEnabled } = settingsStore.data;
    if (autoPlayText) {
      let { vendor, originalText, langFrom, langDetected = langFrom } = translation;
      playText({ vendor, text: originalText, lang: langDetected });
    }
    if (historyEnabled) {
      await loadHistory();
      importHistory(translation);
    }
    sendResponse<TranslatePayloadResult>({ data: translation });
  } catch (error) {
    sendResponse<TranslatePayloadResult>({ error });
  }
});

onMessageType<PlayTextToSpeechPayload>(MessageType.TTS_PLAY, ({ payload }) => {
  playText(payload);
});

onMessageType(MessageType.TTS_STOP, () => {
  stopPlayingAll();
});
