import { MessageType, PlayTextToSpeechPayload, TranslatePayload, TranslatePayloadResult } from "./messages";
import { promisifyMessage, sendMessage } from "./runtime";
import { getActiveTab } from "./tabs";
import { isTranslation, ITranslationResult } from "../vendors";

export async function getActiveTabText() {
  var activeTab = await getActiveTab();
  return promisifyMessage<void, string>({
    tabId: activeTab.id,
    type: MessageType.GET_SELECTED_TEXT
  })
}

export async function translateText(payload: TranslatePayload) {
  var { data, error } = await promisifyMessage<TranslatePayload, TranslatePayloadResult>({
    type: MessageType.TRANSLATE_TEXT,
    payload: payload
  });
  if (data) return data;
  else throw error;
}

export function ttsPlay(payload: PlayTextToSpeechPayload | ITranslationResult) {
  if (isTranslation(payload)) {
    var { langFrom, langDetected = langFrom, originalText, vendor } = payload;
    payload = {
      vendor: vendor,
      lang: langDetected,
      text: originalText
    }
  }
  sendMessage({
    type: MessageType.TTS_PLAY,
    payload: payload,
  });
}

export function ttsStop() {
  sendMessage({
    type: MessageType.TTS_STOP
  });
}
