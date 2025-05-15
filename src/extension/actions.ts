import type { ITranslationResult } from "../providers";
import type { IHistoryItem } from "../components/user-history/history.storage";
import { AITranslatePayload, broadcastMessage, getActiveTab, isBackgroundWorker, Message, OpenAITextToSpeechPayload, sendMessage, TranslatePayload } from "./index";
import { isSystemPage } from "../common-vars";
import { MessageType, ProxyRequestPayload, ProxyResponsePayload, ProxyResponseType, SaveToFavoritesPayload, SaveToHistoryPayload, StorageDeletePayload, StorageReadPayload, StorageSyncPayload, StorageWritePayload } from "./messages";
import { handleProxyRequestPayload } from "../background/httpProxy.bgc";
import { readFromExternalStorage, removeFromExternalStorage, writeToExternalStorage } from "../background/storage.bgc";
import { getHistoryItemOffline, saveToFavorites, saveToHistory } from "../background/history.bgc";
import { textToSpeech, translateText } from "../background/open-ai.bgc";
import { toBinaryFile } from "../utils/binary";

export async function getSelectedText(): Promise<string> {
  const activeTab = await getActiveTab();

  // fix: Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist
  if (!activeTab.url || isSystemPage(activeTab.url)) {
    return "";
  }

  return sendMessage<void, string>({
    type: MessageType.GET_SELECTED_TEXT,
    tabId: activeTab.id,
  });
}

export async function proxyRequest<Response>(payload: ProxyRequestPayload): Promise<Response> {
  let response: ProxyResponsePayload<Response>;

  if (isBackgroundWorker()) {
    response = await handleProxyRequestPayload(payload);
  } else {
    response = await sendMessage<ProxyRequestPayload>({
      type: MessageType.PROXY_REQUEST,
      payload: {
        responseType: ProxyResponseType.JSON, /*default*/
        ...payload,
      },
    });
  }

  if (payload.responseType === ProxyResponseType.BLOB) {
    return toBinaryFile(
      response.data as Uint8Array,
      response.headers["content-type"]
    ) as Response;
  }

  return response.data;
}

export function saveToHistoryAction(translation: ITranslationResult | IHistoryItem) {
  if (isBackgroundWorker()) {
    return saveToHistory({ translation });
  }

  return sendMessage<SaveToHistoryPayload, ITranslationResult>({
    type: MessageType.SAVE_TO_HISTORY,
    payload: {
      translation,
    },
  });
}

export function saveToFavoritesAction(item: ITranslationResult | IHistoryItem, { isFavorite = true } = {}) {
  if (isBackgroundWorker()) {
    return saveToFavorites({ item, isFavorite });
  }

  return sendMessage<SaveToFavoritesPayload>({
    type: MessageType.SAVE_TO_FAVORITES,
    payload: {
      item: item,
      isFavorite: isFavorite,
    },
  });
}

export async function getTranslationFromHistoryAction(payload: TranslatePayload) {
  if (payload.from === "auto") {
    return; // skip: source-language always saved as detected-language in history
  }

  if (isBackgroundWorker()) {
    return getHistoryItemOffline(payload);
  }

  return sendMessage<TranslatePayload, ITranslationResult | void>({
    type: MessageType.GET_FROM_HISTORY,
    payload,
  });
}

export async function writeToExternalStorageAction(payload: StorageWritePayload) {
  if (isBackgroundWorker()) {
    return writeToExternalStorage(payload);
  }

  return sendMessage<StorageWritePayload>({
    type: MessageType.STORAGE_DATA_WRITE,
    payload,
  });
}

export async function readFromExternalStorageAction(payload: StorageReadPayload) {
  if (isBackgroundWorker()) {
    return readFromExternalStorage(payload);
  }

  return sendMessage<StorageReadPayload>({
    type: MessageType.STORAGE_DATA_READ,
    payload,
  });
}

export async function removeFromExternalStorageAction(payload: StorageDeletePayload) {
  if (isBackgroundWorker()) {
    return removeFromExternalStorage(payload);
  }

  return sendMessage<StorageDeletePayload>({
    type: MessageType.STORAGE_DATA_REMOVE,
    payload,
  });
}

export const syncExternalStorageUpdate = <T>(payload: StorageSyncPayload<T>) => {
  const msg: Message<StorageSyncPayload<T>> = {
    type: MessageType.STORAGE_DATA_SYNC,
    payload,
  };

  return broadcastMessage(msg);
}

export async function checkContextInvalidationError() {
  try {
    await sendMessage({
      type: MessageType.CONTEXT_INVALIDATION_CHECK,
    });

    return false;
  } catch (err) {
    return (
      err instanceof Error &&
      err.message.includes("Extension context invalidated")
    );
  }
}

export async function aiTranslateAction<P extends AITranslatePayload>(payload: P) {
  if (isBackgroundWorker()) {
    return translateText(payload);
  }

  return sendMessage<P>({
    type: MessageType.AI_TRANSLATION,
    payload,
  });
}

export async function aiTextToSpeechAction<P extends OpenAITextToSpeechPayload>(payload: P) {
  if (isBackgroundWorker()) {
    return textToSpeech(payload);
  }

  return sendMessage<P>({
    type: MessageType.AI_TEXT_TO_SPEECH,
    payload,
  });
}
