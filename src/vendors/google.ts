import { parseJson, Translation, TranslationError, Vendor } from "./vendor";
import { encodeQuery } from "../utils/encodeQuery";

class Google extends Vendor {
  public name = 'google';
  public title = 'Google';
  public url = 'https://translate.googleapis.com';
  public publicUrl = 'https://translate.google.com';
  public maxTextInputLength = 5000;

  getAudioUrl(lang, text) {
    return this.url + `/translate_tts?client=gtx&ie=UTF-8&tl=${lang}&q=${text}`;
  }

  protected translate(langFrom, langTo, text): Promise<Translation> {
    var reqParams: RequestInit = {};

    var useHttpPost = encodeURIComponent(text).length >= 1000;
    if (useHttpPost) {
      reqParams.method = 'post';
      reqParams.body = 'q=' + encodeURIComponent(text);
      reqParams.headers = {
        'Content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
      };
    }

    var url = this.url + '/translate_a/single?' +
      encodeQuery('client=gtx&dt=t&dt=bd&dj=1&source=input', {
        q: !useHttpPost ? text : null,
        sl: langFrom,
        tl: langTo,
        hl: langTo, // word type header for dictionary
      });

    return fetch(url, reqParams).then(parseJson).then((res: GoogleTranslation) => {
      var translation: Translation = {
        langDetected: res.src,
        translation: res.sentences.map(sentence => sentence.trans).join(''),
        dictionary: []
      };
      if (res.dict) {
        translation.dictionary = res.dict.map(dict => {
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
    }).catch((error: TranslationError) => {
      var { status, url, responseText } = error;
      if (status === 503 && url.startsWith("https://ipv4.google.com/sorry")) {
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
    orig: string // text original
    trans: string // text translated
  }[]
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
}

const params = require('./google.json');
export const google = new Google(params);