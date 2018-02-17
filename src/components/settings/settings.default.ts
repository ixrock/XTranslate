import { ISettingsState } from "./settings.types";

export const defaultSettings: ISettingsState = {
  autoPlayText: false,
  showTextToSpeechIcon: true,
  showNextVendorIcon: true,
  showCopyTranslationIcon: true,
  useDarkTheme: false,
  showInContextMenu: true,
  showIconNearSelection: true,
  showPopupAfterSelection: false,
  showPopupOnDoubleClick: true,
  showPopupOnHotkey: true,
  rememberLastText: false,
  vendor: "google",
  langFrom: "auto",
  langTo: navigator.language.split('-')[0],
  hotkey: { altKey: true, code: "X", keyCode: "X".codePointAt(0) },
  historyEnabled: false,
  historySaveWordsOnly: true,
  historyAvoidDuplicates: true,
  popupFixedPos: "", // possible values defined as css-classes in popup.scss
};