import { Hotkey } from "../../utils/parseHotkey";
import { getTranslator } from "../../vendors";
import { createSyncStorage } from "../../storages";

export const settingsStorage = createSyncStorage("settings", {
  autoPlayText: false,
  useChromeTtsEngine: false,
  showTextToSpeechIcon: true,
  showNextVendorIcon: true,
  showCopyTranslationIcon: true,
  useDarkTheme: false,
  showInContextMenu: false,
  showIconNearSelection: true,
  showPopupAfterSelection: false,
  showPopupOnClickBySelection: false,
  showPopupOnDoubleClick: true,
  showPopupOnHotkey: true,
  showTranslatedFrom: false,
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
  hotkey: {
    altKey: true,
    shiftKey: true,
    code: "X"
  } as Hotkey,
});

export class SettingsStore {
  ready = settingsStorage.whenReady;

  get data() {
    return settingsStorage.get();
  }

  setVendor(vendorName: string) {
    var translator = getTranslator(vendorName);
    var { vendor, langFrom, langTo } = this.data;
    if (vendor === vendorName) return;
    if (!translator.langFrom[langFrom]) {
      this.data.langFrom = Object.keys(translator.langFrom)[0];
    }
    if (!translator.langTo[langTo]) {
      this.data.langTo = Object.keys(translator.langTo)[0];
    }
    this.data.vendor = vendorName;
  }
}

export const settingsStore = new SettingsStore();