import { ITranslationError, ITranslationResult, Translator } from "./translator";
import { encodeQuery } from "../utils/encodeQuery";

class Google extends Translator {
  public name = 'google';
  public title = 'Google';
  public apiUrl = 'https://translate.googleapis.com';
  public publicUrl = 'https://translate.google.com';
  public textInputMaxLength = 5000;
  public ttsMaxLength = 187;

  constructor() {
    super(require("./google.json"));
  }

  // todo: split long texts to queue of chunks with ttsMaxLenght and play one by one
  getAudioUrl(lang, text) {
    if (text.length > this.ttsMaxLength) return;
    var textEncoded = encodeURIComponent(text);
    return this.apiUrl + `/translate_tts?client=gtx&ie=UTF-8&tl=${lang}&q=${textEncoded}`;
  }

  protected translate(langFrom, langTo, text): Promise<ITranslationResult> {
    var reqParams: RequestInit = {};

    var getApiUrl = (withText = true) => {
      return this.apiUrl + '/translate_a/single?' +
        encodeQuery('client=gtx&dj=1&source=input', {
          q: withText ? text : null,
          sl: langFrom,
          tl: langTo,
          hl: langTo, // header for dictionary (part of speech)
          dt: [
            "t", // translation
            "bd", // dictionary
            "rm", // translit
            "qca", // spelling correction
            // "ss", // synsets
            // "rw", // related words
            // "md", // definitions
            // "at", // alternative translations
            // "ex", // examples
          ],
        })
    }

    var url = getApiUrl();
    if (url.length >= this.maxUrlLength) {
      url = getApiUrl(false);

      reqParams.method = 'post';
      reqParams.body = 'q=' + text;
      reqParams.headers = {
        'Content-type': 'application/x-www-form-urlencoded'
      };
    }

    return fetch(url, reqParams).then(this.parseJson).then((res: GoogleTranslation) => {
      var { src, sentences, dict, spell } = res;
      var translation: ITranslationResult = {
        langDetected: src,
        translation: sentences.map(sentence => sentence.trans).join(''),
        dictionary: []
      };
      if (spell) {
        translation.spellCorrection = spell.spell_res;
      }
      if (dict) {
        translation.transcription = sentences[sentences.length - 1].src_translit;
        translation.dictionary = dict.map(dict => {
          return {
            wordType: dict.pos,
            meanings: dict.entry.map(entry => {
              return {
                word: entry.word,
                translation: entry.reverse_translation,
              }
            })
          }
        });
      }
      return translation;
    }).catch((error: ITranslationError) => {
      var { statusCode, url, responseText } = error;
      if (statusCode === 503 && url.startsWith("https://ipv4.google.com/sorry")) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(responseText, "text/html");
        var infoDiv = doc.querySelector("#infoDiv");
        if (infoDiv) error.statusText = infoDiv.innerHTML;
        window.open(this.publicUrl + `/#${langFrom}/${langTo}/${text}`);
      }
      throw error;
    });
  }
}

interface GoogleTranslation {
  src: string // lang detected
  sentences: {
    orig: string // issue (EN-RU)
    trans: string // вопрос
  }[] & [{
    translit: string // "vopros"
    src_translit?: string // ˈiSHo͞o
  }]
  dict?: {
    pos: string // word type
    base_form: string // in source lang
    terms: string[] // translations for this word type
    entry: {
      score: number
      word: string // single translation
      reverse_translation: string[] // in source lang
    }[]
  }[]
  spell?: {
    spell_res: string
    spell_html_res: string
  }
  alternative_translations?: {
    src_phrase: string
    raw_src_segment: string
    start_pos: number
    end_pos: number
    alternative: {
      word_postproc: string
      score: number
    }[]
  }[]
  definitions?: {
    pos: string
    base_form: string
    entry: {
      gloss: string
      example: string
      definition_id: string
    }[]
  }[]
  synsets?: {
    pos: string
    base_form: string
    entry: {
      synonym: string[]
      definition_id: string
    }[]
  }[]
  examples?: {
    example: {
      text: string
      definition_id: string
    }[]
  }
  related_words?: {
    word: string[]
  }
}

const google = new Google();
Translator.registerVendor(google.name, google);
