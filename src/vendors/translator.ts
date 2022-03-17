// Base class for all translation vendors

import type React from "react";
import { observable } from "mobx";
import { autoBind, createLogger, JsonResponseError } from "../utils";
import { ProxyRequestPayload, ProxyResponseType } from "../extension/messages";
import { chromeTtsPlay, chromeTtsStop, getTranslationFromHistory, proxyRequest, saveToHistory } from "../extension/actions";
import { settingsStore } from "../components/settings/settings.storage";

export interface TranslatorLanguages {
  from: Record<string/*locale*/, string> & { auto?: string };
  to?: Record<string, string>;
}

export interface TranslateParams {
  from: string;
  to: string;
  text: string;
}

export interface TranslatePayload extends TranslateParams {
  vendor: string;
}

export abstract class Translator {
  static readonly vendors = observable.map<string, Translator>();
  static readonly logger = createLogger({ systemPrefix: "[TRANSLATOR]" });

  abstract name: string; // code name, e.g. "google"
  abstract title: string; // human readable name, e.g. "Google"
  abstract publicUrl: string; // public translation service page
  abstract apiUrl: string; // service api url
  public langFrom: Record<string, string> = {};
  public langTo: Record<string, string> = {};
  public audio: HTMLAudioElement;

  constructor({ from: langFrom, to: langTo }: TranslatorLanguages) {
    autoBind(this);

    const { auto, ...langToFallback } = langFrom;
    this.langFrom = langFrom;
    this.langTo = langTo ?? langToFallback;

    this.translate = new Proxy(this.translate, {
      apply: async (translate, callContext, [params]: [TranslateParams]): Promise<ITranslationResult> => {
        return this.#handleTranslation(translate, params);
      }
    });
  }

  abstract translate(params: TranslateParams): Promise<ITranslationResult>;

  async #handleTranslation(
    originalTranslate: (params: TranslateParams) => Promise<ITranslationResult>,
    params: TranslateParams,
  ): Promise<ITranslationResult> {
    let translation = await this.searchResultInHistory({ vendor: this.name, ...params });
    if (translation) {
      Translator.logger.info(`serving result from history`, params);
    }

    if (!translation) {
      const getResult = async (customParams: Partial<TranslateParams> = {}) => {
        const customizedParams = { ...params, ...customParams };
        const result: ITranslationResult = await Reflect.apply(originalTranslate, this, [customizedParams]);
        return this.normalize(result, customizedParams);
      };

      // getting translation via network
      translation = await getResult();
      const swapLangParams = this.swapLangCheck(translation);
      if (swapLangParams) {
        translation = await getResult(swapLangParams);
      }
    }

    return this.handleSideEffects(translation);
  }

  protected request<Response>(payload: ProxyRequestPayload): Promise<Response> {
    return proxyRequest(payload);
  }

  protected async searchResultInHistory(params: TranslatePayload): Promise<ITranslationResult | undefined> {
    if (params.from === "auto") {
      return; // always get fresh result for auto-detecting languages
    }

    const cachedResult = await getTranslationFromHistory(params);
    if (cachedResult) {
      return this.normalize(cachedResult, params);
    }
  }

  protected handleSideEffects(translation: ITranslationResult): ITranslationResult {
    const { langDetected, originalText } = translation;
    const { autoPlayText, historyEnabled } = settingsStore.data;

    if (autoPlayText) this.speak(langDetected, originalText);
    if (historyEnabled) saveToHistory(translation);

    return translation;
  }

  protected normalize(result: ITranslationResult, initParams: TranslateParams): ITranslationResult {
    const { from: langFrom, to: langTo, text: originalText } = initParams;
    const langDetected = result.langDetected ?? (
      langFrom !== "auto" ? langFrom : null
    );
    return {
      ...result,
      vendor: this.name,
      dictionary: result.dictionary ?? [],
      langFrom,
      langDetected,
      langTo,
      originalText,
    };
  }

  protected swapLangCheck(normalizedResult: ITranslationResult): Partial<TranslateParams> | undefined {
    var { langTo, langFrom, langDetected, originalText, translation } = normalizedResult;
    var sameTextResult = originalText.trim().toLowerCase() === translation.toLowerCase().trim();

    if (sameTextResult && langDetected === langTo) {
      return {
        from: langDetected,
        to: langFrom !== "auto" ? langFrom : "en",
      };
    }
  };

  getLangPairShortTitle(langFrom: string, langTo: string) {
    return [langFrom, langTo].join(' → ').toUpperCase();
  }

  getLangPairTitle(langFrom: string, langTo: string) {
    return [this.langFrom[langFrom], this.langTo[langTo]].join(' → ');
  }

  getFullPageTranslationUrl(pageUrl: string, lang: string): string {
    return null; // should be overridden in sub-classes if supported
  }

  async speak(lang: string, text: string) {
    this.stopSpeaking(); // stop previous if any

    const audioUrl = this.getAudioUrl(lang, text);
    const useChromeTtsEngine = Boolean(settingsStore.data.useChromeTtsEngine || !audioUrl);

    Translator.logger.info(`[TTS]: speaking in lang="${lang}" text="${text}"`, {
      useChromeTtsEngine,
    });

    if (useChromeTtsEngine) {
      if (lang === "en") lang = "en-US";
      chromeTtsPlay({ lang, text });
    } else if (audioUrl) {
      try {
        this.audio = document.createElement("audio");
        this.audio.src = await this.request({
          url: audioUrl,
          responseType: ProxyResponseType.DATA_URI,
          requestInit: {
            credentials: "include",
          },
        });
        await this.audio.play();
      } catch (error) {
        Translator.logger.error(`[TTS]: failed to play: ${error}`, { lang, text });
      }
    }
  }

  static stopSpeaking() {
    Translator.logger.info(`[TTS]: stop speaking`);
    getTranslators().forEach(vendor => vendor.audio?.pause());
    chromeTtsStop();
  }

  stopSpeaking() {
    this.audio?.pause();
    Translator.stopSpeaking();
  }

  getAudioUrl(lang: string, text: string): string {
    return;
  }

  canTranslate(langFrom: string, langTo: string) {
    return !!(this.langFrom[langFrom] && this.langTo[langTo]);
  }

  renderSettingsListWidget(): React.ReactNode {
    return null;
  }
}

export interface ITranslationResult {
  // auto-added normalized fields
  vendor?: string
  langFrom?: string
  langTo?: string
  originalText?: string

  // should be provided from api response in `translate(params)`
  translation: string
  langDetected?: string
  transcription?: string
  spellCorrection?: string
  dictionary?: ITranslationDictionary[];
}

export interface ITranslationDictionary {
  wordType: string
  transcription?: string
  meanings: ITranslationDictionaryMeaning[]
}

export interface ITranslationDictionaryMeaning {
  word: string // translation
  translation: string[] // similar words in source lang
  examples?: string[][] // examples in source lang
}

export interface ITranslationError extends JsonResponseError {
}

export function isTranslationError(error: ITranslationError | any): error is ITranslationError {
  return error?.statusCode > 0 && error?.statusCode < 500; // valid http-status code
}

export function isRTL(lang: string) {
  return [
    "ar", // arabic
    "he", // hebrew (yandex, bing)
    "iw", // hebrew (google)
    "fa", // persian
    "ur", // urdu
  ].includes(lang);
}

export function getTranslators(): Translator[] {
  return Array.from(Translator.vendors.values());
}

export function getTranslator(name: string) {
  return Translator.vendors.get(name);
}

export function getNextTranslator(name: string, langFrom: string, langTo: string, reverse = false) {
  var vendors = getTranslators();
  var vendor: Translator;
  var list: Translator[] = [];
  var index = vendors.findIndex(vendor => vendor.name === name);
  var beforeCurrent = vendors.slice(0, index);
  var afterCurrent = vendors.slice(index + 1);
  if (reverse) {
    list.push(...beforeCurrent.reverse(), ...afterCurrent.reverse());
  } else {
    list.push(...afterCurrent, ...beforeCurrent)
  }
  while ((vendor = list.shift())) {
    if (vendor.canTranslate(langFrom, langTo)) return vendor;
  }
  return null;
}
