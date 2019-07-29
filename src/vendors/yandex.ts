import { ITranslationResult, Translator } from "./translator";
import { encodeQuery } from "../utils/encodeQuery";

class Yandex extends Translator {
  public name = 'yandex';
  public title = 'Yandex';
  public apiUrl = 'https://translate.yandex.net';
  public publicUrl = 'https://translate.yandex.com';
  public textMaxLength = 10000;

  constructor() {
    super(require('./yandex.json'));
  }

  canUseDictionary(langFrom: string, langTo: string) {
    return this.params.dictionary.indexOf([langFrom, langTo].join('-')) > -1;
  }

  protected async translate(langFrom, langTo, text): Promise<ITranslationResult> {
    var translationReq = (): Promise<YandexTranslation> => {
      var apiUrl = this.apiUrl + '/api/v1/tr.json/translate?' +
        encodeQuery({
          srv: "yawidget",
          options: 1, // add detected language to response
          lang: langFrom === "auto" ? langTo : [langFrom, langTo].join('-'),
          text: text,
        });
      return fetch(apiUrl).then(this.parseJson);
    };

    var dictReq = (from = langFrom, to = langTo): Promise<YandexDictionary> => {
      var apiUrl = 'https://dictionary.yandex.net/dicservice.json/lookup?' +
        encodeQuery({
          ui: to,
          lang: [from, to].join('-'),
          text: text
        });
      var canUseDictionary = this.canUseDictionary(from, to);
      var tooBigUrl = apiUrl.length >= this.maxUrlLength;
      if (tooBigUrl || !canUseDictionary) return Promise.resolve(null);
      return fetch(apiUrl).then(this.parseJson).catch(() => null);
    };

    // main translation
    var translationRes = await translationReq();
    var translation: ITranslationResult = {
      langDetected: translationRes.detected.lang,
      translation: translationRes.text.join(' '),
      dictionary: []
    };

    // dictionary translations
    var dictRes = await dictReq(translation.langDetected);
    if (dictRes) {
      translation.dictionary = dictRes.def.map(dict => {
        if (!translation.transcription && dict.ts) {
          translation.transcription = dict.ts;
        }
        return {
          wordType: dict.pos,
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
      })
    }

    return translation;
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
      mean?: { text: string }[]
      syn?: { text: string, pos: string, gen: string }[]
      ex?: {
        text: string
        tr: { text: string }[]
      }[]
    }[]
  }[]
}

const yandex = new Yandex();
Translator.register(yandex.name, yandex);
