// [IPC]: inter-process communications (background <-> options-page <-> content-pages)
import type { ITranslationResult } from "../vendors";

export const enum MessageType {
  PROXY_REQUEST = "PROXY_REQUEST",
  GET_SELECTED_TEXT = "GET_SELECTED_TEXT",
  TRANSLATE_WITH_VENDOR = "TRANSLATE_WITH_VENDOR",
  TRANSLATE_FULL_PAGE = "TRANSLATE_FULL_PAGE",
  SAVE_TO_HISTORY = "SAVE_TO_HISTORY",
  GET_FROM_HISTORY = "GET_TRANSLATION_FROM_CACHE",
  CHROME_TTS_PLAY = "TEXT_TO_SPEECH_PLAY",
  CHROME_TTS_STOP = "TEXT_TO_SPEECH_STOP",
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
  translation: ITranslationResult;
}

export interface ChromeTtsPayload {
  text: string;
  lang: string;
  rate?: number; // default: 1.0
}
