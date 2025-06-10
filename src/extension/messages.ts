// [IPC]: inter-process communications for [options-page] <-> [background] <-> [content-pages]
import { ITranslationResult, OpenAIVoiceTTS, ProviderCodeName, TranslateParams } from "../providers";
import type { IHistoryItem } from "../components/user-history/history.storage";

export enum MessageType {
  PROXY_REQUEST = "PROXY_REQUEST",
  TRANSLATE_FULL_PAGE = "TRANSLATE_FULL_PAGE",
  GET_SELECTED_TEXT = "GET_SELECTED_TEXT",
  SAVE_TO_HISTORY = "SAVE_TO_HISTORY",
  SAVE_TO_FAVORITES = "SAVE_TO_FAVORITES",
  GET_FROM_HISTORY = "GET_TRANSLATION_FROM_CACHE",
  STORAGE_DATA_READ = "READ_FROM_EXTERNAL_STORAGE",
  STORAGE_DATA_WRITE = "WRITE_TO_EXTERNAL_STORAGE",
  STORAGE_DATA_REMOVE = "REMOVE_FROM_EXTERNAL_STORAGE",
  STORAGE_DATA_SYNC = "SYNC_STORAGE",
  OPENAI_TRANSLATION = "OPENAI_TRANSLATION",
  OPENAI_TEXT_TO_SPEECH = "OPENAI_TEXT_TO_SPEECH",
  INJECT_CONTENT_SCRIPT = "INJECT_CONTENT_SCRIPT",
  RUNTIME_ERROR_CONTEXT_INVALIDATED = "RUNTIME_ERROR_CONTEXT_INVALIDATED",
}

export interface Message<Payload extends {} | []> {
  type: MessageType;
  tabId?: number;
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

export interface ProxyResponsePayload<Data = unknown> {
  url: string;
  headers: { [header: string]: string; "content-type"?: string };
  data: Data;
}

export interface InjectContentScriptPayload {
  tabId?: number;
}

export interface TranslatePayload extends TranslateParams {
  provider: ProviderCodeName;
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
}

export interface StorageSyncPayload<T = any> extends StorageWritePayload<T> {
}

export interface StorageDeletePayload extends Omit<StorageWritePayload, "state"> {
}

export interface AITranslatePayload {
  provider: ProviderCodeName;
  apiKey: string;
  model: string;
  text: string;
  targetLanguage: string;
  sourceLanguage?: string; /* if not provided translation-request considered as "auto-detect" */
}

export interface AITextToSpeechPayload {
  provider: ProviderCodeName;
  model: string;
  apiKey: string;
  text: string;
  targetLanguage?: string; /* or auto-detect if not provided */
  speed?: number; /* 0.5 - 4.0 */
  voice?: string;
  response_format?: "mp3"
}

export interface OpenAITextToSpeechPayload extends AITextToSpeechPayload {
  voice?: OpenAIVoiceTTS;
}
