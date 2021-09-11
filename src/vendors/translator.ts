// Base class for translation vendor
import { observable } from "mobx";
import { isPlainObject } from "lodash";
import { autoBind } from "../utils/autobind";
import { PlayTextToSpeechPayload } from "../extension/messages";
import { settingsStore } from "../components/settings/settings.storage";

export interface ITranslatorParams {
  languages: {
    from: ILanguages;
    to?: ILanguages;
  }
}

export interface ILanguages {
  auto?: string;
  [langCode: string]: string;
}

export interface ITranslationResult {
  vendor?: string
  originalText?: string
  langFrom?: string
  langTo?: string
  langDetected?: string
  translation: string
  transcription?: string
  spellCorrection?: string
  dictionary: {
    wordType: string
    transcription?: string
    meanings: {
      word: string
      translation: string[]
      examples?: string[][]
    }[]
  }[]
}

export interface ITranslationError {
  statusCode: number; // http response code (e.g. 400)
  message?: string; // error explanation
}

export abstract class Translator {
  static readonly vendors = observable.map<string, Translator>();

  static register(name: string, vendor: Translator) {
    Translator.vendors.set(name, vendor);
  }

  abstract name: string; // code name, "google"
  abstract title: string; // human readable name, e.g. "Google"
  abstract publicUrl: string; // for opening url from settings
  abstract apiUrl: string;

  protected abstract translate(from: string, to: string, text: string): Promise<ITranslationResult>;

  public lastResult: ITranslationResult;
  public lastError: ITranslationError;
  public lastAudioUrl: string;
  public ttsAudio: HTMLAudioElement;
  public langFrom: ILanguages = {};
  public langTo: ILanguages = {};
  public maxUrlLength = 2048; // max length of the url for GET/POST requests
  public textMaxLength = 10000;
  public reqMaxSizeInBytes = 1024 * 10; // 10 kB
  protected autoSwapUsed = false;

  constructor(protected params: ITranslatorParams) {
    autoBind(this);

    var { from: langFrom, to: langTo } = params.languages;
    var { auto, ...langToFallback } = langFrom;
    this.langFrom = langFrom;
    this.langTo = langTo ?? langToFallback;
  }

  getFullPageTranslationUrl(pageUrl: string, lang: string): string {
    return null; // should be overridden in sub-classes if supported
  }

  async parseJson(res: Response): Promise<any> {
    try {
      var data = await res.json();
      if (res.ok) return data; // status-code >= 200 < 300
      else throw data; // json-error response
    } catch (error) {
      const jsonError: ITranslationError = {
        statusCode: res.status,
        message: res.statusText,
      };
      // extend with possible detailed error message from json-response
      if (isPlainObject(error)) {
        Object.assign(jsonError, error);
      }
      throw jsonError;
    }
  }

  async getTranslation(from: string, to: string, text: string): Promise<ITranslationResult> {
    var last = this.lastResult;
    if (last && last.langFrom === from && last.langTo === to && last.originalText === text) {
      return last;
    }
    if (text.length > this.textMaxLength) {
      text = text.substr(0, this.textMaxLength);
    }
    try {
      this.lastError = null;
      var translation = await this.translate(from, to, text);
      this.lastResult = {
        ...translation,
        vendor: this.name,
        originalText: text,
        langFrom: from,
        langTo: to,
      };
      return this.autoSwap(this.lastResult);
    } catch (err) {
      this.lastError = err;
      throw err;
    }
  }

  private autoSwap(result: ITranslationResult) {
    try {
      var { langTo, langFrom, langDetected, originalText, translation } = result;
      var autoDetect = langFrom === "auto";
      var sameText = originalText.trim().toLowerCase() === translation.toLowerCase().trim();
      if (!this.autoSwapUsed && sameText) {
        this.autoSwapUsed = true;
        var navLang = navigator.language.split('-')[0];
        if (langDetected === langTo) langTo = autoDetect ? navLang : langFrom;
        langFrom = langDetected || navLang;
        return this.getTranslation(langFrom, langTo, originalText).finally(() => {
          this.autoSwapUsed = false;
        });
      }
    } catch (err) {
      console.log("auto-swap failed", this.name, { result, err });
    }
    return result;
  };

  async playText(lang: string, text: string) {
    stopPlayingAll();
    var audioUrl = this.getAudioUrl(lang, text);
    if (settingsStore.data.useChromeTtsEngine || !audioUrl) {
      if (!chrome.tts) return;
      if (lang === "en") lang = "en-US";
      chrome.tts.speak(text, { lang, rate: 1.0 });
    } else if (audioUrl !== this.lastAudioUrl) {
      this.lastAudioUrl = audioUrl;
      var audio = this.ttsAudio = document.createElement('audio');
      audio.autoplay = true;
      audio.src = await getTranslator("google").getAudioSource(audioUrl);
    } else if (this.ttsAudio) {
      this.ttsAudio.play();
    }
  }

  getAudioUrl(lang: string, text: string): string {
    return;
  }

  getAudioSource(url: string): Promise<string> {
    return fetch(url, { credentials: 'include', referrerPolicy: "no-referrer" }).then(res => {
      var error = !(res.status >= 200 && res.status < 300);
      if (error) throw res;
      return res.blob().then(blob => URL.createObjectURL(blob));
    });
  }

  stopPlaying() {
    chrome.tts && chrome.tts.stop();
    if (!this.ttsAudio) return;
    delete this.lastAudioUrl;
    this.ttsAudio.pause();
    URL.revokeObjectURL(this.ttsAudio.src);
  }

  canTranslate(langFrom: string, langTo: string) {
    return !!(this.langFrom[langFrom] && this.langTo[langTo]);
  }
}

export function isRTL(lang: string) {
  return [
    "ar", // arabic
    "he", // hebrew (yandex, bing)
    "iw", // hebrew (google)
    "fa", // persian
    "ur", // urdu
  ].indexOf(lang) > -1;
}

export function getTranslators(): Translator[] {
  return Array.from(Translator.vendors.values());
}

export function getTranslator(name: string) {
  return Translator.vendors.get(name);
}

export function playText(payload: PlayTextToSpeechPayload) {
  const { vendor, text, lang } = payload;
  return getTranslator(vendor).playText(lang, text);
}

export function stopPlayingAll() {
  getTranslators().forEach(vendor => vendor.stopPlaying());
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

export function isTranslation(result: ITranslationResult | any = {}): result is ITranslationResult {
  var { translation, originalText, vendor }: ITranslationResult = result;
  return !!(translation && originalText && vendor);
}
