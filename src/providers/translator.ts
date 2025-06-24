// Base class for all translation providers

import { observable } from "mobx";
import { autoBind, createLogger, JsonResponseError } from "../utils";
import { isOptionsPage, ProxyRequestPayload, ProxyResponseType } from "../extension";
import { ProviderCodeName } from "./providers";
import { getMessage } from "../i18n";
import { getTTSVoices, speak, stopSpeaking, TTSVoice } from "../tts";
import { settingsStore } from "../components/settings/settings.storage";
import { proxyRequest } from "../background/httpProxy.bgc";
import { getTranslationFromHistoryAction, saveToHistoryAction } from "../background/history.bgc";
import { MetricSourceEnv, sendMetric } from "../background/metrics.bgc";

export interface ProviderLanguagesApiMap {
  from: { [locale: string]: string; auto?: string };
  to?: { [locale: string]: string };
}

export interface TranslateParams {
  from: string;
  to: string;
  text?: string;
  texts?: string[]; // for multi-translate
}

export interface TranslatorParams {
  languages: ProviderLanguagesApiMap;
}

export abstract class Translator {
  static readonly instances = observable.map<ProviderCodeName, Translator>([], { deep: false });
  static readonly providers = observable.map<ProviderCodeName, { new(): Translator }>([], { deep: false });

  static register(name: ProviderCodeName, ctor: { new(): Translator }) {
    this.providers.set(name, ctor);
  };

  abstract name: ProviderCodeName; // registered code name, e.g. "google"
  abstract title: string; // human readable name, e.g. "Google"
  abstract publicUrl: string; // public translation service page
  abstract apiUrl: string; // service api url
  abstract isRequireApiKey: boolean; // require to bring api-key to work
  public langFrom: Record<string, string> = {};
  public langTo: Record<string, string> = {};
  public audio: HTMLAudioElement;
  public audioDataUrl = "";
  protected logger = createLogger({ systemPrefix: "[TRANSLATOR]" });

  protected constructor({ languages: { from: langFrom, to: langTo } }: TranslatorParams) {
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

  async translateMany(params: TranslateParams): Promise<string[]> {
    this.logger.error(`translation for multi texts is not implemented for ${this.title}`);
    return [];
  }

  protected async request<Response>(payload: ProxyRequestPayload): Promise<Response> {
    const response = await proxyRequest<Response>(payload);

    if (isTranslationError(response)) {
      throw response;
    }
    return response as Response;
  }

  async #handleTranslation(
    originalTranslate: (params: TranslateParams) => Promise<ITranslationResult>,
    params: TranslateParams,
  ): Promise<ITranslationResult> {
    let translation = await getTranslationFromHistoryAction({ provider: this.name, ...params }) as ITranslationResult;
    if (translation) translation = this.normalize(translation, params);

    // get result via network
    if (!translation) {
      const getTranslationResult = async (customParams: Partial<TranslateParams> = {}) => {
        const reqParams = { ...params, ...customParams };
        try {
          let result = await Reflect.apply(originalTranslate, this, [reqParams]);
          result = this.normalize(result, reqParams);

          void sendMetric("translate_used", {
            source: this.metricSource,
            provider: this.name,
            lang_from: reqParams.from,
            lang_to: reqParams.to,
          });

          return result;
        } catch (err) {
          void sendMetric("translate_error", {
            error: isTranslationError(err) ? err.message : JSON.stringify(err),
            source: this.metricSource,
            provider: this.name,
            lang_from: reqParams.from,
            lang_to: reqParams.to,
          });
          throw err;
        }
      };

      translation = await getTranslationResult();

      const reverseTranslationParams = this.swapTranslationCheck(translation);
      if (reverseTranslationParams) {
        translation = await getTranslationResult(reverseTranslationParams);
      }
    }

    // handle final output
    requestIdleCallback(() => this.handleSideEffects(translation));
    return translation;
  }

  protected get metricSource(): MetricSourceEnv {
    return isOptionsPage() ? "translate_tab" : "popup";
  }

  protected handleSideEffects(translation: ITranslationResult): ITranslationResult {
    const { langDetected, originalText } = translation;
    const { autoPlayText, historyEnabled } = settingsStore.data;

    if (autoPlayText) {
      void this.speak(langDetected, originalText);
    }
    if (historyEnabled) {
      void saveToHistoryAction({
        translation,
        source: this.metricSource,
      });
    }

    return translation;
  }

  protected normalize(result: ITranslationResult, params: TranslateParams): ITranslationResult {
    const { from: langFrom, to: langTo, text: originalText } = params;

    return {
      ...result,
      vendor: this.name,
      dictionary: result.dictionary ?? [],
      langFrom,
      langTo,
      originalText,
      langDetected: result.langDetected ?? langFrom,
    };
  }

  protected swapTranslationCheck(translationResult: ITranslationResult): Partial<TranslateParams> | undefined {
    const reverseTargetLang = settingsStore.data.langToReverse
    const { langTo, langFrom, langDetected, originalText, translation } = translationResult;
    const sameText = originalText.trim().toLowerCase() === translation.toLowerCase().trim();
    let swapParamsWith: Partial<TranslateParams>;

    if (langDetected !== langFrom && langFrom !== "auto") {
      swapParamsWith = {
        from: langDetected,
        to: langFrom,
      }
    } else if (reverseTargetLang && sameText) {
      swapParamsWith = {
        from: langTo,
        to: reverseTargetLang,
      }
    }

    if (swapParamsWith) {
      const { from, to } = swapParamsWith;
      this.logger.info(`SWAP-TRANSLATION-RESULT-WITH: from="${from}", to="${to}"`, {
        translationResult,
        reverseTargetLang,
        sameText,
      });
    }

    return swapParamsWith;
  };

  static getLangPairTitleShort(langFrom: string, langTo: string) {
    return [langFrom, langTo].join(' → ').toUpperCase();
  }

  getLangPairTitle(langFrom: string, langTo: string) {
    return [
      this.langFrom[langFrom] ?? langFrom,
      this.langTo[langTo] ?? langTo
    ].join(' → ');
  }

  speakSynth(text: string, voice?: TTSVoice) {
    try {
      speak(text, voice); // // tts-play
    } catch (err) {
      this.logger.error(`[TTS]: speech synthesis failed to speak: ${err}`, { text, voice });
    }
  }

  async speak(lang: string, text: string, voice?: TTSVoice) {
    this.stopSpeaking(); // stop previous if any

    const audioUrl = this.getAudioUrl(text, lang);
    const audioFile = await this.getAudioFile(text, lang);
    const useSpeechSynthesis = Boolean(settingsStore.data.useSpeechSynthesis || !(audioUrl || audioFile));

    if (!voice) {
      const voices = await getTTSVoices();
      voice = voices[settingsStore.data.ttsVoiceIndex];
    }

    if (useSpeechSynthesis) {
      this.logger.info(`[TTS]: speaking using system speech synthesis`, {
        lang, text, voice,
        voiceIndex: settingsStore.data.ttsVoiceIndex,
      });
      this.speakSynth(text, voice);
    } else {
      try {
        const audioBinary = audioFile ?? await this.request<Blob>({
          url: audioUrl,
          responseType: ProxyResponseType.BLOB
        });

        this.audioDataUrl = URL.createObjectURL(audioBinary);
        this.logger.info(`[TTS]: speaking via api request`, { lang, text });
        this.audio = document.createElement("audio");
        this.audio.src = this.audioDataUrl = URL.createObjectURL(audioBinary);
        await this.audio.play();

        void sendMetric("tts_played", {
          source: this.metricSource,
          provider: this.name,
          lang: lang,
        });
      } catch (error) {
        this.logger.error(`[TTS]: failed to play: ${error}`, { lang, text });
        this.speakSynth(text, voice); // fallback to TTS-synthesis engine

        void sendMetric("tts_error", {
          error: String(error),
          source: this.metricSource,
          provider: this.name,
          lang: lang,
        })
      }
    }
  }

  stopSpeaking() {
    this.logger.info(`[TTS]: stop speaking`);
    getTranslators().forEach(translator => translator.audio?.pause());
    stopSpeaking(); // tts-stop
    URL.revokeObjectURL(this.audioDataUrl);
  }

  async getAudioFile(text: string, lang?: string): Promise<Blob> {
    return;
  }

  getAudioUrl(text: string, lang: string): string {
    return;
  }

  canTranslate(langFrom: string, langTo: string) {
    return !!(this.langFrom[langFrom] && this.langTo[langTo]);
  }

  canTranslateFullPage(): boolean {
    return Translator.prototype.translateMany !== this.constructor.prototype.translateMany;
  }

  getSupportedLanguages(desired: { langFrom: string, langTo: string }) {
    let { langFrom, langTo } = desired;
    if (!this.langFrom[langFrom]) {
      const firstLangFrom = Object.keys(this.langFrom)[0];
      langFrom = firstLangFrom ?? "auto";
    }
    if (!this.langTo[langTo]) {
      const navLang = navigator.language;
      const firstLangTo = Object.keys(this.langTo)[0];
      langTo = [navLang, navLang.split("-")[0], "en"].find(lang => this.langTo[lang]) ?? firstLangTo;
    }
    return { langFrom, langTo }
  }

  isAvailable(): boolean {
    if (!this.isRequireApiKey) {
      return true; // not required additional input-settings from user
    }
    return this.getAuthSettings().apiKeySanitized !== "";
  }

  getAuthSettings(): TranslatorAuthParams {
    return {} as TranslatorAuthParams;
  }

  protected setupApiKey(saveKeyCallback: (key: string) => void) {
    const key = window.prompt(getMessage("auth_setup_key_info", { provider: this.title }));
    if (key) saveKeyCallback(key);
  }

  protected sanitizeApiKey(apiKey: string) {
    if (!apiKey) return "";
    const tail = 4;
    return apiKey.substring(0, tail) + "*-*" + apiKey.substring(apiKey.length - tail);
  }
}

export interface TranslatorAuthParams {
  apiKeySanitized: string;
  setupApiKey(): void;
  clearApiKey(): void;
}

export interface ITranslationResult {
  // auto-added normalized fields
  vendor?: ProviderCodeName
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

export function isTranslationResult(data: ITranslationResult | unknown): data is ITranslationResult {
  const result = data as ITranslationResult;
  return !!(getTranslator(result?.vendor) && result?.translation);
}

export function isTranslationError(error: Error | ITranslationError | unknown): error is ITranslationError {
  const httpStatus = (error as ITranslationError)?.statusCode;
  return Number.isInteger(httpStatus) && !(httpStatus >= 200 && httpStatus < 300);
}

export function isRTL(lang: string) {
  return [
    "ar", // arabic
    "he", // hebrew (bing)
    "iw", // hebrew (google)
    "fa", // persian
    "ur", // urdu
  ].includes(lang);
}

export function getTranslators(): Translator[] {
  return Array.from(Translator.providers.keys()).map(getTranslator);
}

export function getTranslator<T extends Translator>(name: ProviderCodeName): T | undefined {
  const Provider = Translator.providers.get(name);
  if (!Translator.instances.has(name) && Provider) {
    Translator.instances.set(name, new Provider());
  }
  return Translator.instances.get(name) as T;
}

export function getNextTranslator(lastUsedProvider: ProviderCodeName, langFrom: string, langTo: string, reverse = false) {
  let translator: Translator;
  const providers = getTranslators();
  const translators: Translator[] = [];
  const index = providers.findIndex(translator => translator.name === lastUsedProvider);
  const beforeCurrent = providers.slice(0, index);
  const afterCurrent = providers.slice(index + 1);
  if (reverse) {
    translators.push(...beforeCurrent.reverse(), ...afterCurrent.reverse());
  } else {
    translators.push(...afterCurrent, ...beforeCurrent)
  }
  while ((translator = translators.shift())) {
    if (translator.canTranslate(langFrom, langTo) && translator.isAvailable()) {
      return translator;
    }
  }
  return null;
}
