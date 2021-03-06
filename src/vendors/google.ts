import GoogleTranslateParams from "./google.json"
import { ITranslationError, ITranslationResult, Translator } from "./translator";
import { delay } from "../utils";
import { createStorage } from "../storage-factory";

class Google extends Translator {
  public name = 'google';
  public title = 'Google';
  public apiUrl = 'https://translate.googleapis.com';
  public publicUrl = 'https://translate.google.com';
  public textMaxLength = 5000;
  public ttsMaxLength = 187;

  protected apiClients = ["gtx", "dict-chrome-ex"];
  protected apiClient = createStorage<string>("google_api_client", this.apiClients[0]);
  protected apiClientSwitched = false;

  constructor() {
    super(GoogleTranslateParams);
  }

  getFullPageTranslationUrl(pageUrl: string, lang: string): string {
    return `https://translate.google.com/translate?tl=${lang}&u=${pageUrl}`
  }

  // try to use next available api-client id if google has blocked the traffic
  protected useNextApiClient() {
    var apiClient = this.apiClient.get();
    var index = this.apiClients.findIndex(client => client === apiClient);
    var nextApiClient = this.apiClients[index + 1] ?? this.apiClients[0];
    this.apiClient.set(nextApiClient);
  }

  // todo: split long texts to queue of chunks with ttsMaxLenght and play one by one
  getAudioUrl(lang, text) {
    if (text.length > this.ttsMaxLength) return;
    var textEncoded = encodeURIComponent(text);
    var apiClient = this.apiClient.get();
    return this.apiUrl + `/translate_tts?client=${apiClient}&ie=UTF-8&tl=${lang}&q=${textEncoded}`;
  }

  protected translate(langFrom, langTo, text): Promise<ITranslationResult> {
    var reqParams: RequestInit = {};

    var getApiUrl = ({ query = text } = {}) => {
      return this.apiUrl + '/translate_a/single?' + new URLSearchParams([
        ["client", this.apiClient.get()],
        ["source", "input"],
        ["dj", "1"],
        ["q", query],
        ["sl", langFrom],
        ["tl", langTo],
        ["hl", langTo], // header in dictionary for part of speech
        ["dt", "t"],    // translation
        ["dt", "bd"],   // dictionary
        ["dt", "rm"],   // translit (?)
        ["dt", "rw"],   // related words
        ["dt", "qca"],  // spelling correction
      ])
    }

    var url = getApiUrl();
    if (url.length >= this.maxUrlLength) {
      url = getApiUrl({ query: "" }); // skip text in url and send with POST body payload

      reqParams.method = 'POST';
      reqParams.body = 'q=' + text;
      reqParams.headers = {
        'Content-type': 'application/x-www-form-urlencoded'
      };
    }

    return fetch(url, reqParams).then(this.parseJson).then((res: GoogleTranslation) => {
      var { src, ld_result, sentences, dict, spell } = res;
      var detectedLang = src || ld_result ? ld_result.srclangs[0] : "";
      var translation: ITranslationResult = {
        langDetected: detectedLang,
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
    }).catch(async (error: ITranslationError) => {
      var { statusCode } = error;
      if (statusCode === 503 && !this.apiClientSwitched) {
        await delay(1000);
        this.useNextApiClient();
        this.apiClientSwitched = true;
        return this.translate(langFrom, langTo, text).finally(() => {
          this.apiClientSwitched = false;
        });
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
  ld_result: {
    extended_srclangs: string[]
    srclangs: string[]
  }
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
Translator.register(google.name, google);
