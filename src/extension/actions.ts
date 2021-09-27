import type { ITranslationResult } from "../vendors";
import { MessageId, MessageType, ProxyRequestPayload, ProxyRequestResponse, ProxyResponseType, SaveToHistoryPayload } from "./messages";
import { getActiveTab, promisifyMessage } from "./index";

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
