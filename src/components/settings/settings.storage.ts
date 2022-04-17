import { action } from "mobx";
import { Hotkey } from "../../utils/parseHotkey";
import { getTranslator } from "../../vendors";
import { createStorageHelper } from "../../extension/storage";

export const settingsStorage = createStorageHelper("settings", {
  area: "sync", // share user-data via google account (chrome.storage.sync)
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
    popupFixedPos: "", // possible values defined as css-classes in popup.scss
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
  get ready() {
    return settingsStorage.whenReady;
  }

  get data() {
    return settingsStorage.get();
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