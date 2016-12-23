// Internal messages api interface
import { Favorite } from "../components/favorites/favorites.types";
import { getId } from './runtime'

export enum MessageType {
  APP_STATE,
  LICENSE_STATE,
  MENU_TRANSLATE_WITH_VENDOR,
  MENU_TRANSLATE_FAVORITE,
  MENU_TRANSLATE_FULL_PAGE,
  TRANSLATE_FROM_FRAME,
  HIDE_POPUP_FROM_FRAME,
}

export interface Message {
  type: MessageType
  payload?: any
}

export function postMessage(message: Message) {
  window.top.postMessage({ id: getId(), message: message }, "*");
}

export function onPostMessage(callback: (message: Message) => void) {
  var listener = function (e: MessageEvent) {
    var { id, message } = e.data;
    if (id !== getId()) return;
    callback(message);
  };
  window.addEventListener("message", listener, false);
  return () => window.removeEventListener("message", listener, false);
}

export interface MenuTranslateVendorPayload {
  vendor: string
}

export interface MenuTranslateFavoritePayload extends MenuTranslateVendorPayload, Favorite {
}

export interface TranslateFromFramePayload {
  translate: string[]
  rect: ClientRect
}