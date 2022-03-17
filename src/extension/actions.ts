import type { ITranslationResult, TranslatePayload } from "../vendors";
import { ChromeTtsPayload, MessageType, ProxyRequestPayload, ProxyResponseType, SaveToHistoryPayload } from "./messages";
import { getActiveTab, sendMessage } from "./index";

export async function getSelectedText() {
  return sendMessage<void, string>({
    type: MessageType.GET_SELECTED_TEXT,
    tabId: (await getActiveTab()).id,
  });
}

export async function proxyRequest<Response>(payload: ProxyRequestPayload) {
  return sendMessage<ProxyRequestPayload, Response>({
    type: MessageType.PROXY_REQUEST,
    payload: {
      responseType: ProxyResponseType.JSON, /*default*/
      ...payload,
    },
  });
}

export function saveToHistory(translation: ITranslationResult) {
  return sendMessage<SaveToHistoryPayload, ITranslationResult>({
    type: MessageType.SAVE_TO_HISTORY,
    payload: {
      translation,
    },
  });
}

export function getTranslationFromHistory(payload: TranslatePayload) {
  return sendMessage<TranslatePayload, ITranslationResult | void>({
    type: MessageType.GET_FROM_HISTORY,
    payload,
  });
}

export function chromeTtsPlay(data: ChromeTtsPayload) {
  return sendMessage<ChromeTtsPayload>({
    type: MessageType.CHROME_TTS_PLAY,
    payload: data,
  });
}

export function chromeTtsStop() {
  return sendMessage({
    type: MessageType.CHROME_TTS_STOP,
  });
}
