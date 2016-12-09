import { ISettingsState } from './settings.types'

export const defaultSettings: ISettingsState = {
  autoPlayText: false,
  showPlayIcon: true,
  useDarkTheme: false,
  showContextMenu: true,
  showIconNearSelection: true,
  showPopupAfterSelection: false,
  showPopupOnDoubleClick: true,
  showPopupOnHotkey: true,
  allowAds: false,
  vendor: "google",
  langFrom: "auto",
  langTo: navigator.language.split('-')[0],
  hotkey: {
    altKey: true,
    keyCode: "X".codePointAt(0)
  }
};