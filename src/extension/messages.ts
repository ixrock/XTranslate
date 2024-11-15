// [IPC]: inter-process communications for [options-page] <-> [background] <-> [content-pages]
import type { ITranslationResult } from "../vendors";
import type { IHistoryItem } from "../components/user-history/history.storage";

export const enum MessageType {
  PROXY_REQUEST = "PROXY_REQUEST",
  GET_SELECTED_TEXT = "GET_SELECTED_TEXT",
  TRANSLATE_WITH_VENDOR = "TRANSLATE_WITH_VENDOR",
  TRANSLATE_FULL_PAGE = "TRANSLATE_FULL_PAGE",
  SAVE_TO_HISTORY = "SAVE_TO_HISTORY",
  SAVE_TO_FAVORITES = "SAVE_TO_FAVORITES",
  GET_FROM_HISTORY = "GET_TRANSLATION_FROM_CACHE",
  STORAGE_DATA_READ = "READ_FROM_LOCAL_OR_EXTERNAL_STORAGE",
  STORAGE_DATA_WRITE = "SAVE_TO_LOCAL_OR_EXTERNAL_STORAGE",
  STORAGE_DATA_REMOVE = "REMOVE_ITEM_FROM_STORAGE",
  STORAGE_DATA_SYNC = "SYNC_DATA_FROM_STORAGE",
  OPENAI_TRANSLATION = "OPENAI_TRANSLATION",
}

export interface Message<Payload = any /*json-serializable*/> {
  type: MessageType;
  payload?: Payload;
}

export const enum ProxyResponseType {
  JSON = "json",
  TEXT = "text",
  DATA_URL = "data-url", // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
  BLOB = "binary-data",
}

export interface ProxyRequestPayload {
  url: string;
  responseType?: ProxyResponseType;
  requestInit?: ProxyRequestInit;
}

export type ProxyRequestInit = Omit<RequestInit, "window" | "signal" | "body"> & {
  body?: string;
};

export interface ProxyResponsePayload<Data> {
  url: string;
  headers: { [header: string]: string; "content-type"?: string };
  data: Data;
}

export interface TranslateWithVendorPayload {
  vendor: string;
  text: string;
  from?: string;
  to?: string;
}

export interface SaveToHistoryPayload {
  translation: ITranslationResult | IHistoryItem;
}

export interface SaveToFavoritesPayload {
  item: ITranslationResult | IHistoryItem;
  isFavorite: boolean;
}

export interface StorageReadPayload {
  key: string;
  area: chrome.storage.AreaName;
}

export interface StorageWritePayload<T = any> {
  key: string;
  area: chrome.storage.AreaName;
  state: T;
  origin: string; // location URL or unique window/resource ID where action happened
}

export interface StorageSyncPayload<T = any> extends StorageWritePayload<T> {
}

export interface StorageDeletePayload extends Omit<StorageWritePayload, "state"> {
}

export interface OpenAITranslatePayload {
  apiKey: string;
  model?: string;
  text: string;
  targetLanguage: string;
  sourceLanguage?: string; /* if not provided translation-request considered as "auto-detect" */
}
