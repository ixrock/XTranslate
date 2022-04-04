import type { ITranslationResult, TranslatePayload } from "../vendors";
import { ChromeTtsPayload, MessageType, ProxyRequestPayload, ProxyResponsePayload, ProxyResponseType, SaveToHistoryPayload } from "./messages";
import { getActiveTab, sendMessage } from "./index";

export async function getSelectedText(): Promise<string> {
  const activeTab = await getActiveTab();

  return sendMessage<void, string>({
    type: MessageType.GET_SELECTED_TEXT,
    tabId: activeTab.id,
  });
}

export async function proxyRequest<Response>(payload: ProxyRequestPayload): Promise<Response> {
  const response: ProxyResponsePayload<Response> = await sendMessage<ProxyRequestPayload>({
    type: MessageType.PROXY_REQUEST,
    payload: {
      responseType: ProxyResponseType.JSON, /*default*/
      ...payload,
    },
  });

  if (payload.responseType === ProxyResponseType.BLOB) {
    const arrayBuffer = Uint8Array.from(response.data as unknown as number[]).buffer;

    return new Blob([arrayBuffer], {
      type: response.headers["content-type"]
    }) as any as Response;
  }

  return response.data;
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
  if (payload.from === "auto") {
    return; // skip: source-language always saved as detected-language in history
  }

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
