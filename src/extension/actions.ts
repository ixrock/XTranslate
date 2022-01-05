import type { ITranslationResult, TranslatePayload } from "../vendors";
import { ChromeTtsPayload, MessageId, MessageType, ProxyRequestPayload, ProxyRequestResponse, ProxyResponseType, SaveToHistoryPayload } from "./messages";
import { getActiveTab, promisifyMessage, sendMessage } from "./index";

export async function getSelectedText() {
  var activeTab = await getActiveTab();
  return promisifyMessage<void, string>({
    tabId: activeTab.id,
    type: MessageType.GET_SELECTED_TEXT
  });
}

export async function proxyRequest(payload: ProxyRequestPayload, messageId?: MessageId) {
  return promisifyMessage<ProxyRequestPayload, ProxyRequestResponse>({
    id: messageId,
    type: MessageType.PROXY_REQUEST,
    payload: {
      responseType: ProxyResponseType.JSON, /*default*/
      ...payload,
    },
  });
}

export function saveToHistory(translation: ITranslationResult) {
  return promisifyMessage<SaveToHistoryPayload>({
    type: MessageType.SAVE_TO_HISTORY,
    payload: {
      translation,
    },
  });
}

export function getTranslationFromHistory(payload: TranslatePayload) {
  return promisifyMessage<TranslatePayload, ITranslationResult | undefined>({
    type: MessageType.GET_FROM_HISTORY,
    payload,
  });
}

export function chromeTtsPlay<D extends ChromeTtsPayload>(data: D) {
  sendMessage<D>({
    type: MessageType.CHROME_TTS_PLAY,
    payload: data,
  });
}

export function chromeTtsStop() {
  sendMessage({
    type: MessageType.CHROME_TTS_STOP,
  });
}
