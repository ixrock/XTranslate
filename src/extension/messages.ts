// Message types for communication btw different parts of the app

export enum MessageType {
  MENU_TRANSLATE_WITH_VENDOR,
  MENU_TRANSLATE_FAVORITE,
  MENU_TRANSLATE_FULL_PAGE,
  PLAY_TEXT_TO_SPEECH,
  STOP_TTS_PLAYING,
  GET_SELECTED_TEXT,
  SELECTED_TEXT,
}

export interface Message<D = any> {
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
