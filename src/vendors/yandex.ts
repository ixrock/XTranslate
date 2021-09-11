import YandexTranslateParams from "./yandex.json"
import { ITranslationResult, Translator } from "./translator";

class Yandex extends Translator {
  public name = 'yandex';
  public title = 'Yandex';
  public apiUrl = 'https://translate.yandex.net';
  public publicUrl = 'https://translate.yandex.com';
  public textMaxLength = 10000;

  constructor() {
    super(YandexTranslateParams);
  }

  getFullPageTranslationUrl(pageUrl: string, lang: string): string {
    return `https://translate.yandex.com/translate?lang=${lang}&url=${pageUrl}`
  }

  isDictionarySupported(langFrom: string, langTo: string): boolean {
    return !!supportedDictionary[langFrom]?.includes(langTo);
  }

  protected async translate(langFrom, langTo, text): Promise<ITranslationResult> {
    var translationReq = (): Promise<YandexTranslation> => {
      var apiUrl = this.apiUrl + '/api/v1/tr.json/translate?' +
        new URLSearchParams({
          srv: "yawidget",
          options: "1", // add detected language to response
          lang: langFrom === "auto" ? langTo : [langFrom, langTo].join('-'),
          text: text,
        });
      return fetch(apiUrl).then(this.parseJson);
    };

    var dictReq = async (from = langFrom, to = langTo): Promise<YandexDictionary> => {
      var apiUrl = 'https://dictionary.yandex.net/dicservice.json/lookup?' +
        new URLSearchParams({
          ui: to,
          text: text,
          lang: [from, to].join('-'),
        });
      var canUseDictionary = this.isDictionarySupported(from, to);
      var tooBigUrl = apiUrl.length >= this.maxUrlLength;
      if (tooBigUrl || !canUseDictionary) return;
      return fetch(apiUrl).then(this.parseJson).catch(Function); // ignore errors
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

export const supportedDictionary: Record<string, string[]> = {
  "be": ["be", "ru"],
  "bg": ["ru"],
  "cs": ["cs", "en", "ru"],
  "da": ["en", "ru"],
  "de": ["de", "en", "ru", "tr"],
  "el": ["en", "ru"],
  "en": ["cs", "da", "de", "el", "en", "es", "et", "fi", "fr", "it", "lt", "lv", "nl", "no", "pt", "ru", "sk", "sv", "tr", "uk"],
  "es": ["en", "es", "ru"],
  "et": ["en", "ru"],
  "fi": ["en", "fi", "ru"],
  "fr": ["en", "fr", "ru"],
  "hu": ["hu", "ru"],
  "it": ["en", "it", "ru"],
  "lt": ["en", "lt", "ru"],
  "lv": ["en", "ru"],
  "mhr": ["ru"],
  "mrj": ["ru"],
  "nl": ["en", "ru"],
  "no": ["en", "ru"],
  "pl": ["ru"],
  "pt": ["en", "ru"],
  "ru": ["be", "bg", "cs", "da", "de", "el", "en", "es", "et", "fi", "fr", "hu", "it", "lt", "lv", "mhr", "mrj", "nl", "no", "pl", "pt", "ru", "sk", "sv", "tr", "tt", "uk"],
  "sk": ["en", "ru"],
  "sv": ["en", "ru"],
  "tr": ["de", "en", "ru"],
  "tt": ["ru"],
  "uk": ["en", "ru", "uk"]
};

const yandex = new Yandex();
Translator.register(yandex.name, yandex);
