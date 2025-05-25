import { action, makeObservable } from "mobx";
import { Hotkey } from "../../utils/parseHotkey";
import { createStorage } from "../../storage";
import { getTranslator, GrokAIModel, OpenAIModel, ProviderCodeName } from "../../providers";

export type PopupPosition = "" /*auto*/ | "left top" | "left bottom" | "right top" | "right bottom";

export type XIconPosition = {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
};

export type SettingsStorageModel = typeof settingsStorage.defaultValue;
export type SettingsStorageFullPage = typeof settingsStorage.defaultValue.fullPageTranslation;

export const settingsStorage = createStorage("settings", {
  area: "sync", // share synced data via logged-in account (google, firefox, etc.)
  defaultValue: {
    autoPlayText: false,
    useSpeechSynthesis: false,
    showTextToSpeechIcon: true,
    showSaveToFavoriteIcon: true,
    showNextVendorIcon: false,
    showCopyTranslationIcon: true,
    useDarkTheme: false,
    showIconNearSelection: true,
    showPopupAfterSelection: false,
    showPopupOnClickBySelection: false,
    showPopupOnDoubleClick: true,
    showPopupOnHotkey: true,
    showTranslatedFrom: true,
    rememberLastText: false,
    textInputTranslateDelayMs: 750,
    vendor: "google" as ProviderCodeName,
    langFrom: "auto",
    langTo: navigator.language.split('-')[0],
    langToReverse: "", // applied in case when `langFrom` == "auto" && `langDetected` == `langTo`
    historyEnabled: false,
    historySaveWordsOnly: true,
    historyPageSize: 50,
    favorites: {} as FavoritesList,
    popupPosition: "" as PopupPosition,
    iconPosition: {} as XIconPosition,
    ttsVoiceIndex: 0,
    openAiModel: OpenAIModel.RECOMMENDED,
    grokAiModel: GrokAIModel.RECOMMENDED,
    skipVendorInRotation: {} as Record<ProviderCodeName, boolean>,
    customPdfViewer: false,
    fullPageTranslation: {
      provider: "bing" as ProviderCodeName,
      langFrom: "auto",
      langTo: "en",
      showOriginalOnHover: true,
      showTranslationOnHover: false,
      showTranslationInDOM: true,
      alwaysTranslatePages: [],
    },
  }
});

export const popupHotkey = createStorage("popup_hotkey", {
  area: "sync",
  autoLoad: true,
  deepMergeOnLoad: false,
  defaultValue: {
    hotkey: {
      altKey: true,
      shiftKey: true,
      code: "X",
    } as Hotkey
  }
});

export const activeTabStorage = createStorage("tabs_selected_text", {
  defaultValue: {
    tabId: -1,
    title: "",
    url: "",
    selectedText: "",
  },
});

/**
 * Favorites are shown on top of language-select list.
 */
export interface FavoritesList {
  [provider: string]: Record<FavoriteLangDirection, string[]>;
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

  getFavorites(provider: ProviderCodeName, sourceType: FavoriteLangDirection): string[] {
    return this.data.favorites?.[provider]?.[sourceType] ?? [];
  }

  @action
  toggleFavorite(params: { provider: string, sourceType: FavoriteLangDirection, lang: string }) {
    const { provider, sourceType, lang } = params;

    this.data.favorites ??= {};
    this.data.favorites[provider] ??= {
      source: [],
      target: [],
    };

    const favorites = new Set(this.data.favorites[provider][sourceType]);
    if (favorites.has(lang)) {
      favorites.delete(lang)
    } else {
      favorites.add(lang);
    }

    // save update to storage
    this.data.favorites[provider][sourceType] = Array.from(favorites);
  }

  @action
  setProvider(name: ProviderCodeName) {
    const translator = getTranslator(name);
    const { vendor, langFrom, langTo } = this.data;
    if (vendor === name) return;

    const supportedLanguages = translator.getSupportedLanguages({ langFrom, langTo });
    this.data.vendor = name;
    this.data.langFrom = supportedLanguages.langFrom;
    this.data.langTo = supportedLanguages.langTo;
  }
}

export const settingsStore = new SettingsStore();