import { Store } from "../../store";
import { Hotkey } from "../../utils/parseHotkey";

export const defaultSettings = {
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
  textInputTranslateDelayMs: 750,
  vendor: "google",
  langFrom: "auto",
  langTo: navigator.language.split('-')[0],
  historyEnabled: false,
  historySaveWordsOnly: true,
  historyAvoidDuplicates: true,
  historyPageSize: 100,
  popupFixedPos: "", // possible values defined as css-classes in popup.scss
  hotkey: { altKey: true, code: "X" } as Hotkey,
};

export class SettingsStore extends Store<typeof defaultSettings> {
  protected id = "settings";

  constructor() {
    super({
      storageType: "sync",
      initialData: defaultSettings
    });
  }
}

export const settingsStore = new SettingsStore();