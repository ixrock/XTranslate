// Base class for all translation providers

import { observable } from "mobx";
import { autoBind, createLogger, JsonResponseError, strLengthInBytes } from "../utils";
import { ProxyRequestPayload, ProxyResponseType } from "../extension/messages";
import { proxyRequest } from "../background/httpProxy.bgc";
import { settingsStore } from "../components/settings/settings.storage";
import { getTTSVoices, speak, stopSpeaking, TTSVoice } from "../tts";
import { ProviderCodeName } from "./providers";
import { getTranslationFromHistoryAction, saveToHistoryAction } from "../background/history.bgc";
import type { PageTranslator } from "./page-translator";

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
  pageTranslator?: PageTranslator;
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
  public langFrom: Record<string, string> = {};
  public langTo: Record<string, string> = {};
  public audio: HTMLAudioElement;
  public audioDataUrl = "";
  protected logger = createLogger({ systemPrefix: "[TRANSLATOR]" });

  protected constructor({ languages: { from: langFrom, to: langTo }, pageTranslator }: TranslatorParams) {
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
        const customizedParams = { ...params, ...customParams };
        const result: ITranslationResult = await Reflect.apply(originalTranslate, this, [customizedParams]);
        return this.normalize(result, customizedParams);
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

  protected handleSideEffects(translation: ITranslationResult): ITranslationResult {
    const { langDetected, originalText } = translation;
    const { autoPlayText, historyEnabled } = settingsStore.data;

    if (autoPlayText) this.speak(langDetected, originalText);
    if (historyEnabled) saveToHistoryAction(translation);

    return translation;
  }

  protected normalize(result: ITranslationResult, initParams: TranslateParams): ITranslationResult {
    const { from: langFrom, to: langTo, text: originalText } = initParams;

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
      langTo,
      langDetected: result.langDetected ?? langFrom,
      originalText: toLowerCase(originalText),
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
      } catch (error) {
        // FIXME: it might fall due CORS at some sites (e.g. github)
        // Error: refused to load media from 'blob:https://github.com/fce42e78-5c8c-47fc-84d9-a6433ada5840' because it violates the following Content Security Policy directive: "media-src github.com user-images.githubusercontent.com/ secured-user-images.githubusercontent.com/ private-user-images.githubusercontent.com github-production-user-asset-6210df.s3.amazonaws.com gist.github.com github.githubassets.com".
        // So, we have to do some workaround, e.g. with new background 1x1 window or something..
        this.logger.error(`[TTS]: failed to play: ${error}`, { lang, text });
        this.speakSynth(text, voice); // fallback to TTS-synthesis engine
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
      langFrom = Object.keys(this.langFrom)[0] ?? "auto";
    }
    if (!this.langTo[langTo]) {
      const navLang = navigator.language;
      langTo = [navLang, navLang.split("-")[0], "en"].find(langTo => this.langTo[langTo]);
    }
    return { langFrom, langTo }
  }

  getAuthSettings(): TranslatorAuthParams {
    return;
  }

  protected sanitizeApiKey(apiKey: string) {
    if (!apiKey) return "";
    return apiKey.substring(0, 4) + "-****-" + apiKey.substring(apiKey.length - 4);
  }

  protected packGroups(texts: string[], { groupSize = 50, maxBytesPerGroup = 0 } = {}): string[][] {
    const packs = [];
    let buf = [];
    let sizeBytes = 0;

    for (const str of texts) {
      const len = strLengthInBytes(str);

      if (sizeBytes + len > maxBytesPerGroup || buf.length >= groupSize) {
        packs.push(buf);
        buf = [];
        sizeBytes = 0;
      }
      buf.push(str);
      sizeBytes += len;
    }
    if (buf.length) packs.push(buf);
    return packs;
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

export function isTranslationError(error: ITranslationResult | ITranslationError | unknown): error is ITranslationError {
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

export function getNextTranslator(name: ProviderCodeName, langFrom: string, langTo: string, reverse = false) {
  let translator: Translator;
  const providers = getTranslators();
  const translators: Translator[] = [];
  const index = providers.findIndex(translator => translator.name === name);
  const beforeCurrent = providers.slice(0, index);
  const afterCurrent = providers.slice(index + 1);
  if (reverse) {
    translators.push(...beforeCurrent.reverse(), ...afterCurrent.reverse());
  } else {
    translators.push(...afterCurrent, ...beforeCurrent)
  }
  while ((translator = translators.shift())) {
    if (settingsStore.data.skipVendorInRotation[translator.name]) {
      continue;
    }
    if (translator.canTranslate(langFrom, langTo)) {
      return translator;
    }
  }
  return null;
}
