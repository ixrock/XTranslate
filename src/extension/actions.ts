import { Message, MessageType, PlayTextToSpeechPayload, TranslatePayload, TranslatePayloadResult } from "./messages";
import { onMessage, sendMessage } from "./runtime";
import { getActiveTab, sendTabMessage } from "./tabs";
import { isTranslation, ITranslationResult } from "../vendors";

export async function promisifyMessage<P = any, R = any>({ tabId, ...message }: Message<P> & { tabId?: number }): Promise<R> {
  if (!message.id) {
    message.id = Number(Date.now() * Math.random()).toString(16);
  }
  if (tabId) {
    sendTabMessage(tabId, message);
  }
  else {
    sendMessage(message);
  }
  return new Promise(resolve => {
    var stopListen = onMessage<R>(({ type, payload, id }) => {
      if (type === message.type && id === message.id) {
        stopListen();
        resolve(payload);
      }
    });
  });
}

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
