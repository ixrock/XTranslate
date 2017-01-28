import { ISettingsState } from './settings.types'
import { Hotkey } from "../../utils/parseHotkey";

export const defaultSettings: ISettingsState = {
  autoPlayText: false,
  showPlayIcon: true,
  showNextVendorIcon: false,
  useDarkTheme: false,
  showInContextMenu: true,
  showIconNearSelection: true,
  showPopupAfterSelection: false,
  showPopupOnDoubleClick: true,
  showPopupOnHotkey: true,
  allowAds: false,
  vendor: "google",
  langFrom: "auto",
  langTo: navigator.language.split('-')[0],
  historyEnabled: false,
  hotkey: {
    altKey: true,
    code: "X",
    keyCode: "X".codePointAt(0),
  } as Hotkey
};