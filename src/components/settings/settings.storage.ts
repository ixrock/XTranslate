import { Hotkey } from "../../utils/parseHotkey";
import { getTranslator } from "../../vendors";
import { createStorageHelper } from "../../extension/storage";

export const settingsStorage = createStorageHelper("settings", {
  area: "sync", // sync data via user's google account across devices (chrome)
  defaultValue: {
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
    historyPageSize: 50,
    popupFixedPos: "", // possible values defined as css-classes in popup.scss
    hotkey: {
      altKey: true,
      shiftKey: true,
      code: "X"
    } as Hotkey,
  }
});

export class SettingsStore {
  ready = settingsStorage.whenReady;

  get data() {
    return settingsStorage.get();
  }

  setVendor(name: string) {
    var translator = getTranslator(name);
    var { vendor, langFrom, langTo } = this.data;
    if (vendor === name) return;
    if (!translator.langFrom[langFrom]) {
      this.data.langFrom = Object.keys(translator.langFrom)[0];
    }
    if (!translator.langTo[langTo]) {
      this.data.langTo = Object.keys(translator.langTo)[0];
    }
    this.data.vendor = name;
  }
}

export const settingsStore = new SettingsStore();