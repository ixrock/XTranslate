import { Vendor, VendorParams, Translation, TranslationError, parseJson } from './vendor'
import { encodeQuery } from "../utils/encodeQuery";
import { Storage } from "../extension/storage";

class Yandex extends Vendor {
  public name = 'yandex';
  public title = 'Yandex';
  public url = 'https://translate.yandex.net';
  public publicUrl = 'https://translate.yandex.com';
  public maxTextInputLength = 5000;
  public ttsFormat = 'audio/wav';
  private apiKey = '';

  constructor(params) {
    super(params);
    apiKey().then(apiKey => this.apiKey = apiKey);
  }

  getAudioUrl(lang, text) {
    lang = this.params.tts[lang];
    if (!lang || text.length > 100) return;
    return [
      'https://tts.voicetech.yandex.net/tts?format=' + this.ttsFormat.split('/')[1],
      `quality=hi&platform=web&text=${text}&lang=${lang}`
    ].join('&');
  }

  nextApiKey() {
    var keys = this.params.apiKeys;
    var index = keys.indexOf(this.apiKey);
    var nextKey = keys[index + 1] ? keys[index + 1] : keys[0];
    console.log('Next api key: ', nextKey);
    this.apiKey = nextKey;
    apiKey(nextKey);
  }

  canUseDictionary(langFrom: string, langTo: string) {
    return this.params.dictionary.indexOf([langFrom, langTo].join('-')) > -1;
  }

  protected translate(langFrom, langTo, text): Promise<Translation> {
    var translationReq = (): Promise<YandexTranslation> => {
      var url = this.url + '/api/v1.5/tr.json/translate?' +
          encodeQuery({
            key: this.apiKey,
            format: 'plain', // or "html"
            options: 1, // add detected language to response
            lang: langFrom === "auto" ? langTo : [langFrom, langTo].join('-'),
            text: text,
          });
      return window.fetch(url).then(parseJson);
    };

    var dictReq = (from = langFrom, to = langTo): Promise<YandexDictionary> => {
      var url = 'https://translate.yandex.net/dicservice.json/lookup?' +
          encodeQuery({
            ui: to,
            lang: [from, to].join('-'),
            text: text
          });
      return window.fetch(url).then(parseJson);
    };

    var nextApiKeyUsed = false;
    var request = () => {
      return translationReq()
          .then(translationRes => {
            var langDetected = translationRes.detected.lang;
            var translation: Translation = {
              langDetected: langDetected,
              translation: translationRes.text.join(' '),
              dictionary: []
            };
            if (this.canUseDictionary(langDetected, langTo)) {
              return dictReq(langDetected).then(dictRes => {
                translation.dictionary = dictRes.def.map(dict => {
                  if (!translation.transcription && dict.ts) {
                    translation.transcription = dict.ts;
                  }
                  return {
                    wordType: dict.pos,
                    translation: dict.tr.map(item => item.text),
                    transcription: dict.ts,
                    meanings: dict.tr.map(item => {
                      var meaning = {
                        word: item.text,
                        translation: [],
                        examples: []
                      };
                      if (item.mean) {
                        meaning.translation = item.mean.map(meaning => meaning.text);
                      }
                      if (item.ex) {
                        meaning.examples = item.ex.map(ex => {
                          return [ex.text, ex.tr.map(e => e.text).join(', ')]
                        });
                      }
                      return meaning;
                    })
                  }
                });
                return translation;
              }).catch(() => translation);
            }
            return translation;
          })
          .catch((error: TranslationError) => {
            if (error.error.code >= 400 && !nextApiKeyUsed) {
              nextApiKeyUsed = true;
              this.nextApiKey();
              return request();
            }
            throw error;
          });
    };

    return request();
  }
}

interface YandexTranslation {
  code: number
  text: string[]
  lang: string
  detected: {
    lang: string
  }
}

interface YandexDictionary {
  head: {}
  def: {
    pos: string // word type
    text: string // translation
    ts: string // transcription
    tr: {
      pos: string
      text: string
      mean?: {text: string}[]
      syn?: {text: string, pos: string, gen: string}[]
      ex?: {
        text: string
        tr: {text: string}[]
      }[]
    }[]
  }[]
}

const storage = new Storage();
const apiKey = function (value?): Promise<string> {
  var key = 'yandexApiKey';
  // get api key from storage
  if (!arguments.length) {
    return new Promise(resolve => {
      storage.local.get().then(store => {
        resolve(store[key] || params.apiKeys[0]);
      });
    });
  }
  else {
    // save new api key to local storage
    return new Promise(resolve => {
      return storage.local.set({ [key]: value }).then(() => value);
    });
  }
};

const params: VendorParams = require('./yandex.json');
export const yandex = new Yandex(params);