// Internal messages api interface
import { Favorite } from "../components/favorites/favorites.types";

export enum MessageType {
  APP_STATE,
  MENU_TRANSLATE_WITH_VENDOR,
  MENU_TRANSLATE_FAVORITE,
  MENU_TRANSLATE_FULL_PAGE,
}

export interface Message {
  type: MessageType
  payload?: any
}

export interface MenuTranslateVendorPayload {
  vendor: string
}

export interface MenuTranslateFavoritePayload extends MenuTranslateVendorPayload, Favorite {
}