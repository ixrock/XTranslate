import omit = require("lodash/omit");
import { vendorsList } from "./index";

export abstract class Vendor {
  public abstract name: string;
  public abstract title: string;
  public abstract url: string;
  public abstract publicUrl: string;
  public maxTextInputLength = Number.MAX_SAFE_INTEGER;
  protected autoSwap = false;
  public lastResult: Translation;
  public lastError: { message?: string };
  public ttsAudio: HTMLAudioElement;
  public ttsFormat = 'audio/mp3';
  public langFrom = {};
  public langTo = {};

  constructor(protected params: VendorParams) {
    this.langFrom = params.languages.from;
    this.langTo = params.languages.to || omit(this.langFrom, 'auto');
  }

  protected abstract translate(from: string, to: string, text: string): Promise<Translation>;

  canTranslate(langFrom: string, langTo: string): boolean {
    return this.langFrom[langFrom] && this.langTo[langTo];
  }

  getTranslation(from: string, to: string, text: string): Promise<Translation> {
    var last = this.lastResult;
    if (last && last.langFrom === from && last.langTo === to && last.originalText === text) {
      return Promise.resolve(last);
    }
    var translation = this.translate(from, to, text).then(result => {
      this.lastResult = Object.assign(result, {
        vendor: this.name,
        originalText: text,
        langFrom: from,
        langTo: to,
      });
      return this.lastResult;
    }).then(this.autoSwapLang);
    translation.catch(error => this.lastError = error);
    return translation;
  }

  protected autoSwapLang = (result: Translation) => {
    var { langTo, langFrom, originalText, translation, langDetected } = result;
    var autoDetect = langFrom === 'auto';
    var sameText = originalText.trim().toLowerCase() === translation.toLowerCase().trim();
    var otherLangDetected = langDetected && langDetected !== langFrom;
    if (!autoDetect && !this.autoSwap && (sameText || otherLangDetected)) {
      [langFrom, langTo] = [langTo, langFrom];
      if (otherLangDetected) langFrom = langDetected;
      this.autoSwap = true;
      return this.getTranslation(langFrom, langTo, originalText);
    }
    if (autoDetect && langDetected) {
      var navLang = navigator.language.split('-')[0];
      if (langDetected === langTo && navLang !== langTo) {
        langFrom = langDetected;
        langTo = navLang;
        this.autoSwap = true;
        return this.getTranslation(langFrom, langTo, originalText);
      }
    }
    this.autoSwap = false;
    return Promise.resolve(result);
  };

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

  playText(lang: string, text: string) {
    text = encodeURIComponent(text);
    this.stopPlaying();
    this.ttsAudio = document.createElement('audio');
    this.ttsAudio.autoplay = true;

    var fetching: Promise<string>;
    var vendors = [...vendorsList];
    vendors.unshift(this); // put current vendor to the top
    vendors.splice(vendors.lastIndexOf(this), 1); // remove duplicate
    vendors.forEach(vendor => {
      vendor.stopPlaying();
      var url = vendor.getAudioUrl(lang, text);
      if (url) {
        if (!fetching) fetching = this.getAudioSource(url);
        else fetching = fetching.catch(() => this.getAudioSource(url));
      }
    });
    if (fetching) {
      fetching.then(src => this.ttsAudio.src = src);
    }
  }

  isPlayingText() {
    var tts = this.ttsAudio;
    return tts && tts.currentTime > 0 && !tts.paused && !tts.ended && tts.readyState > 2;
  }

  stopPlaying() {
    if (!this.ttsAudio) return;
    this.ttsAudio.pause();
    URL.revokeObjectURL(this.ttsAudio.src);
  }

  isRightToLeft(lang: string) {
    return RTL_LANGUAGES.indexOf(lang) > -1;
  }
}

const RTL_LANGUAGES = [
  "ar", // arabic
  "he", // hebrew (yandex, bing)
  "iw", // hebrew (google)
  "fa", // persian
  "ur", // urdu
];

export function parseJson(res: Response): Promise<any> {
  var { status, statusText, url } = res;
  var error: TranslationError = { status, statusText, url };
  return res.text().then(text => {
    error.responseText = text;
    var json = null;
    try {
      json = JSON.parse(text);
      if (status >= 200 && status < 300) return json;
      else error.responseJson = json;
    } catch (e) {
    }
    throw error;
  });
}

export interface VendorParams {
  apiKeys?: string[]
  tts?: { [lang: string]: string }
  dictionary?: string[]
  languages: {
    from: { [lang: string]: string }
    to?: { [lang: string]: string }
  }
}

export interface Translation {
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

export interface TranslationError {
  url: string
  status: number
  statusText: any
  responseText?: string
  responseJson?: any
}