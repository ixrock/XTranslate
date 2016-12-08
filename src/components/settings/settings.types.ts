import { Hotkey } from "../../utils/parseHotkey";

export interface ISettingsState {
  autoPlayText?: boolean
  showPlayIcon?: boolean
  useDarkTheme?: boolean
  showContextMenu?: boolean
  showIconNearSelection?: boolean
  showPopupAfterSelection?: boolean
  showPopupOnDoubleClick?: boolean
  showPopupOnHotkey?: boolean
  allowAds?: boolean
  vendor?: string
  langFrom?: string
  langTo?: string
  hotkey?: Hotkey
}