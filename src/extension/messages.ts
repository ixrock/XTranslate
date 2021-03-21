// Messages for communication btw background process and other extension parts
import { ITranslationError, ITranslationResult } from "../vendors/translator";

export enum MessageType {
  MENU_TRANSLATE_WITH_VENDOR,
  MENU_TRANSLATE_FAVORITE,
  MENU_TRANSLATE_FULL_PAGE,
  TTS_PLAY,
  TTS_STOP,
  GET_SELECTED_TEXT,
  TRANSLATE_TEXT,
  STORAGE_SYNC_STATE
}

export interface Message<D = any> {
  id?: string;
  type: MessageType
  payload?: D
}

export interface MenuTranslateVendorPayload {
  vendor: string
  selectedText: string
}

export interface MenuTranslateFavoritePayload extends MenuTranslateVendorPayload {
  from: string;
  to: string;
}

export interface PlayTextToSpeechPayload {
  vendor: string
  lang: string
  text: string
}

export interface TranslatePayload {
  vendor: string;
  from: string;
  to: string;
  text: string;
}

export interface TranslatePayloadResult {
  data?: ITranslationResult;
  error?: ITranslationError;
}

export interface StorageStateChangePayload<S = any> {
  key: string;
  state: S;
  storageArea?: "local" | "sync";
}
