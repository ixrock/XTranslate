// Messages for communication btw background process and other extension parts
import type { ITranslationError, ITranslationResult } from "../vendors/translator";

export enum MessageType {
  MENU_TRANSLATE_WITH_VENDOR = "MENU_TRANSLATE_WITH_VENDOR",
  MENU_TRANSLATE_FULL_PAGE = "MENU_TRANSLATE_FULL_PAGE",
  TTS_PLAY = "TTS_PLAY",
  TTS_STOP = "TTS_STOP",
  GET_SELECTED_TEXT = "GET_SELECTED_TEXT",
  TRANSLATE_TEXT = "TRANSLATE_TEXT",
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
