import { Hotkey } from "../../utils/parseHotkey";

export interface ISettingsState {
  autoPlayText?: boolean
  showPlayIcon?: boolean
  showNextVendorIcon?: boolean
  useDarkTheme?: boolean
  showInContextMenu?: boolean
  showIconNearSelection?: boolean
  showPopupAfterSelection?: boolean
  showPopupOnDoubleClick?: boolean
  showPopupOnHotkey?: boolean
  rememberLastText?: boolean
  vendor?: string
  langFrom?: string
  langTo?: string
  hotkey?: Hotkey
  historyEnabled?: boolean
  historySaveWordsOnly?: boolean
  historyAvoidDuplicates?: boolean
}