import { observable, reaction, toJS, when } from "mobx";
import { Hotkey } from "../../utils/parseHotkey";

export class SettingsStore {
  private id = "settings";

  private initialData = {
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

  @observable loading = false;
  @observable saving = false;
  @observable data = this.initialData;

  constructor() {
    this.load();
    // add reactions after initial loading to prevent dummy saving
    when(() => !this.loading, () => {
      reaction(() => toJS(this.data), this.save, {
        delay: 250
      });
    })
    // sync store changes made from options page (for background & content pages)
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (this.saving) return;
      if (areaName === "sync" && changes[this.id]) {
        Object.assign(this.data, changes[this.id].newValue || {});
      }
    });
  }

  protected load = () => {
    this.loading = true;
    chrome.storage.sync.get(this.id, items => {
      Object.assign(this.data, items[this.id]);
      this.loading = false;
    });
  }

  protected save = () => {
    this.saving = true;
    chrome.storage.sync.set({ [this.id]: this.data }, () => {
      this.saving = false;
    });
  }

  reset = () => {
    for (let prop in this.data) delete this.data[prop];
    Object.assign(this.data, this.initialData);
  }
}

export const settingsStore = new SettingsStore();