import { action, IObservableArray, makeObservable } from "mobx";
import { Hotkey } from "@/utils/parseHotkey";
import { createStorage } from "@/storage";
import { DeepSeekAIModel, GeminiAIModel, getTranslator, GrokAIModel, OpenAIModel, ProviderCodeName } from "@/providers";

export type PopupPosition = "" /*auto*/ | "left top" | "left bottom" | "right top" | "right bottom";
export type DisplayMode = "day" | "night" | "auto";

export type XIconPosition = {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
};

export type SettingsStorageModel = typeof settingsStorage.defaultValue;
export type PopupHotkeyStorageModel = typeof popupHotkey.defaultValue;

export function getDisplayMode(displayMode: unknown): DisplayMode {
  if (displayMode === "day" || displayMode === "night" || displayMode === "auto") {
    return displayMode;
  }
  return "auto";
}

export function isDarkDisplayMode(displayMode: DisplayMode, isSystemDark: boolean): boolean {
  return displayMode === "night" || (displayMode === "auto" && isSystemDark);
}

export function getNextDisplayMode(displayMode: DisplayMode): DisplayMode {
  if (displayMode === "day") return "night";
  if (displayMode === "night") return "auto";
  return "day";
}

export const settingsStorage = createStorage("settings", {
  area: "sync", // share synced data via logged-in account (google, firefox, etc.)
  defaultValue: {
    autoPlayText: false,
    useSpeechSynthesis: false,
    showTextToSpeechIcon: true,
    showSaveToFavoriteIcon: true,
    showProviderSelectIcon: true,
    showCopyTranslationIcon: true,
    displayMode: "auto" as DisplayMode,
    showIconNearSelection: true,
    showPopupAfterSelection: false,
    showPopupOnClickBySelection: false,
    showPopupOnDoubleClick: true,
    showPopupOnHotkey: true,
    showTranslatedFrom: true,
    showPopupAdvancedCustomization: false,
    showPopupSummarizeIcon: true,
    rememberLastText: false,
    textInputAutoTranslateEnabled: false,
    textInputTranslateDelayMs: 1000,
    showAdvancedProviders: false, // advanced-list requires some setup from the user (e.g. adding api-key)
    vendor: "bing" as ProviderCodeName, // api provider
    langFrom: "auto",
    langTo: navigator.language.split('-')[0],
    langToReverse: "", // applied in case when `langFrom` == "auto" && `langDetected` == `langTo`
    historyEnabled: false,
    historySaveWordsOnly: true,
    historyPageSize: 50,
    favorites: {} as FavoritesList,
    popupPosition: "" as PopupPosition,
    iconPosition: {} as XIconPosition,
    customPdfViewer: false,
    openAiModel: OpenAIModel.RECOMMENDED,
    grokAiModel: GrokAIModel.RECOMMENDED,
    deepSeekModel: DeepSeekAIModel.RECOMMENDED,
    geminiModel: GeminiAIModel.RECOMMENDED,
    safeTranslationLimit: 0, // 0 = unlimited, don't ask user for confirmation, useful for paid-API providers
    systemTTSEngineVoiceIndex: 0,
  }
});

export const popupSkipInjectionUrls = createStorage("popup_skip_inject", {
  area: "sync",
  autoLoad: true,
  deepMergeOnLoad: false,
  defaultValue: [
    "https://challenges.cloudflare.com/"
  ] as IObservableArray<string>,
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

export const fullPageTranslateHotkey = createStorage("fullpage_hotkey", {
  area: "sync",
  autoLoad: true,
  deepMergeOnLoad: false,
  defaultValue: {
    enabled: true,
    hotkey: {
      ctrlKey: true,
      shiftKey: true,
      code: "X",
    } as Hotkey
  }
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

  @action.bound
  setProvider(providerCodeName: ProviderCodeName) {
    const translator = getTranslator(providerCodeName);
    const { vendor, langFrom, langTo } = this.data;
    if (vendor === providerCodeName) return;

    const supportedLanguages = translator.getSupportedLanguages({ langFrom, langTo });
    this.data.vendor = providerCodeName;
    this.data.langFrom = supportedLanguages.langFrom;
    this.data.langTo = supportedLanguages.langTo;
  }
}

export const settingsStore = new SettingsStore();
