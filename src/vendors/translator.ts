// Base class for all translation vendors

import type React from "react";
import { observable } from "mobx";
import { autoBind, createLogger, disposer, JsonResponseError } from "../utils";
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
  static readonly vendors = observable.set<Translator>();
  static readonly logger = createLogger({ systemPrefix: "[TRANSLATOR]" });

  static createInstances = disposer();

  static registerInstance(instance: Translator) {
    Translator.vendors.add(instance);
  };

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

  protected async request<Response>(payload: ProxyRequestPayload): Promise<Response> {
    const response = await proxyRequest(payload);
    if (isTranslationError(response)) throw response;
    return response as Response;
  }

  async #handleTranslation(
    originalTranslate: (params: TranslateParams) => Promise<ITranslationResult>,
    params: TranslateParams,
  ): Promise<ITranslationResult> {
    let translation = await getTranslationFromHistory({ vendor: this.name, ...params }) as ITranslationResult;
    if (translation) translation = this.normalize(translation, params);

    // get result via network
    if (!translation) {
      const getResult = async (customParams: Partial<TranslateParams> = {}) => {
        const customizedParams = { ...params, ...customParams };
        const result: ITranslationResult = await Reflect.apply(originalTranslate, this, [customizedParams]);
        return this.normalize(result, customizedParams);
      };

      translation = await getResult();
      const swappedLangParams = this.swapLangCheck(translation);
      if (swappedLangParams) {
        translation = await getResult(swappedLangParams);
      }
    }

    // handle final output
    requestIdleCallback(() => this.handleSideEffects(translation));
    return translation;
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

    function toLowerCase(output: string) {
      const isDictionaryWord = !!result.dictionary;
      return isDictionaryWord ? output.toLowerCase() : output;
    }

    return {
      ...result,
      vendor: this.name,
      translation: toLowerCase(result.translation),
      dictionary: result.dictionary ?? [],
      langFrom,
      langDetected,
      langTo,
      originalText: toLowerCase(originalText),
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
      if (lang.toLowerCase() === "en-us") lang = "en";
      chromeTtsPlay({ lang, text });
    } else if (audioUrl) {
      try {
        this.audio = document.createElement("audio");
        this.audio.src = await this.request({
          url: audioUrl,
          responseType: ProxyResponseType.DATA_URL,
          requestInit: {
            credentials: "include",
          },
        });
        await this.audio.play();
      } catch (error) {
        // TODO: it might fall due CORS in some sites (e.g. github)
        // so we have to do some workaround with new background 1x1 window (due manifest@3.0 limitations currently)
        Translator.logger.error(`[TTS]: failed to play: ${error}`, { lang, text });

        // fallback to native chrome's text-to-speech engine
        chromeTtsPlay({ lang, text });
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
  sourceLanguages?: string[]; // all detected languages when "auto-detect" is used
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

export function isTranslationError(error: ITranslationResult | ITranslationError | unknown): error is ITranslationError {
  const httpStatus = (error as ITranslationError)?.statusCode;
  return Number.isInteger(httpStatus) && !(httpStatus >= 200 && httpStatus < 300);
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

/**
 * List of all registered vendors (translators)
 */
export function getTranslators(): Translator[] {
  return Array.from(Translator.vendors);
}

/**
 * Get registered vendor (translator) if any or nothing
 * @param {string} name
 */
export function getTranslator<T extends Translator>(name: string): T {
  return (Array.from(Translator.vendors) as T[]).find(vendor => vendor.name === name);
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
