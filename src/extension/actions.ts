import type { ITranslationResult, TranslatePayload } from "../vendors";
import type { IHistoryItem } from "../components/user-history/history.storage";
import { getActiveTab, isBackgroundWorker, sendMessage, sendMessageToAllTabs } from "./index";
import { isSystemPage } from "../common-vars";
import { MessageType, ProxyRequestPayload, ProxyResponsePayload, ProxyResponseType, SaveToFavoritesPayload, SaveToHistoryPayload, StorageDeletePayload, StorageReadPayload, StorageSyncPayload, StorageWritePayload } from "./messages";
import { handleProxyRequestPayload } from "../background/httpProxy.bgc";
import { readFromExternalStorage, removeFromExternalStorage, writeToExternalStorage } from "../background/storage.bgc";
import { getHistoryItemOffline, saveToFavorites, saveToHistory } from "../background/history.bgc";

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
    const arrayBuffer = Uint8Array.from(response.data as unknown as number[]).buffer;

    return new Blob([arrayBuffer], {
      type: response.headers["content-type"]
    }) as any as Response;
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

export async function syncExternalStorageUpdate<T = any>(payload: StorageSyncPayload<T>) {
  // send update to options page
  try {
    await sendMessage<StorageSyncPayload<T>>({
      type: MessageType.STORAGE_DATA_SYNC,
      payload,
    });
  } catch (err) {
    if (String(err).includes("Could not establish connection. Receiving end does not exist.")) {
      // do nothing: this error might happen when options page extension window is not opened
    } else {
      throw err
    }
  }

  return sendMessageToAllTabs<StorageSyncPayload<T>>({
    type: MessageType.STORAGE_DATA_SYNC,
    payload,
  });
}
