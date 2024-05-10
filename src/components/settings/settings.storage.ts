import { action, makeObservable } from "mobx";
import { Hotkey } from "../../utils/parseHotkey";
import { getTranslator } from "../../vendors";
import { createStorage } from "../../storage";

export type PopupPosition = "" /*auto*/ | "left top" | "left bottom" | "right top" | "right bottom";

export type SettingsStorageModel = typeof settingsStorage.defaultValue;

export const settingsStorage = createStorage("settings", {
  area: "sync", // share synced data via logged-in account (google, firefox, etc.)
  defaultValue: {
    autoPlayText: false,
    useSpeechSynthesis: false,
    showTextToSpeechIcon: true,
    showSaveToFavoriteIcon: true,
    showNextVendorIcon: false,
    showClosePopupIcon: false,
    showCopyTranslationIcon: true,
    useDarkTheme: false,
    showInContextMenu: true,
    showIconNearSelection: true,
    showPopupAfterSelection: false,
    showPopupOnClickBySelection: false,
    showPopupOnDoubleClick: true,
    showPopupOnHotkey: true,
    showTranslatedFrom: true,
    rememberLastText: false,
    textInputTranslateDelayMs: 750,
    vendor: "google",
    langFrom: "auto",
    langTo: navigator.language.split('-')[0],
    historyEnabled: false,
    historySaveWordsOnly: true,
    historyPageSize: 50,
    favorites: {} as FavoritesList,
    popupPosition: "" as PopupPosition,
    userDataCollect: true,
    hotkey: {
      altKey: true,
      shiftKey: true,
      code: "X"
    } as Hotkey,
  }
});

/**
 * Favorites are shown on top of language-select list.
 */
export interface FavoritesList {
  [vendor: string]: Record<FavoriteLangDirection, string[]>;
}

export type FavoriteLangDirection = "source" | "target";

export class SettingsStore {
  constructor() {
    makeObservable(this);
  }

  get data() {
    return settingsStorage.get();
  }

  load(opts?: { force?: boolean }) {
    return settingsStorage.load(opts);
  }

  getFavorites(vendor: string, sourceType: FavoriteLangDirection): string[] {
    return this.data.favorites?.[vendor]?.[sourceType] ?? [];
  }

  @action
  toggleFavorite(params: { vendor: string, sourceType: FavoriteLangDirection, lang: string }) {
    console.info("[SETTINGS-STORAGE]: updating favorite lang", params);
    const { vendor, sourceType, lang } = params;

    this.data.favorites ??= {};
    this.data.favorites[vendor] ??= {
      source: [],
      target: [],
    };

    const favorites = new Set(this.data.favorites[vendor][sourceType]);
    if (favorites.has(lang)) {
      favorites.delete(lang)
    } else {
      favorites.add(lang);
    }

    // save update to storage
    this.data.favorites[vendor][sourceType] = Array.from(favorites);
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