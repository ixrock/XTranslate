// Base class for all translation vendors

import { observable } from "mobx";
import { autoBind, createLogger, disposer, JsonResponseError } from "../utils";
import { ProxyRequestPayload, ProxyResponseType } from "../extension/messages";
import { getTranslationFromHistoryAction, proxyRequest, saveToHistoryAction } from "../extension/actions";
import { settingsStore } from "../components/settings/settings.storage";
import { getTTSVoices, speak, stopSpeaking, TTSVoice } from "../tts";
import type { VendorCodeName } from "./index";
import type { VendorAuthSettingsProps } from "../components/settings/vendor_auth_settings";

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
  static readonly instances = observable.set<Translator>();
  static createInstances = disposer();

  static registerVendor = (instance: { new(): Translator }) => {
    this.createInstances.push(
      () => this.instances.add(new instance())
    );
  };

  abstract name: VendorCodeName; // registered code name, e.g. "google"
  abstract title: string; // human readable name, e.g. "Google"
  abstract publicUrl: string; // public translation service page
  abstract apiUrl: string; // service api url
  public langFrom: Record<string, string> = {};
  public langTo: Record<string, string> = {};
  public audio: HTMLAudioElement;
  public audioDataUrl = "";
  protected logger = createLogger({ systemPrefix: "[TRANSLATOR]" });

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
    let translation = await getTranslationFromHistoryAction({ vendor: this.name, ...params }) as ITranslationResult;
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

  getLangPairShortTitle(langFrom: string, langTo: string) {
    return [langFrom, langTo].join(' → ').toUpperCase();
  }

  getLangPairTitle(langFrom: string, langTo: string) {
    return [
      this.langFrom[langFrom] ?? langFrom,
      this.langTo[langTo] ?? langTo
    ].join(' → ');
  }

  getFullPageTranslationUrl(pageUrl: string, lang: string): string {
    return null; // should be overridden in sub-classes if supported
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
    getTranslators().forEach(vendor => vendor.audio?.pause());
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

  getAuthSettings(): VendorAuthSettingsProps {
    return;
  }
}

export function sanitizeApiKey(apiKey: string) {
  if (!apiKey) return "";
  return apiKey.substring(0, 4) + "-****-" + apiKey.substring(apiKey.length - 4);
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
  return Array.from(Translator.instances);
}

/**
 * Get registered vendor (translator) if any or nothing
 * @param {string} name
 */
export function getTranslator<T extends Translator>(name: string): T {
  return (Array.from(Translator.instances) as T[]).find(vendor => vendor.name === name);
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
    const vendorName = vendor.name;
    if (settingsStore.data.skipVendorInRotation[vendorName]) {
      continue;
    }
    if (vendor.canTranslate(langFrom, langTo)) {
      return vendor;
    }
  }
  return null;
}
