import GoogleLanguages from "./google.json"
import { createStorageHelper, ProxyRequestInit } from "../extension";
import { isTranslationError, ITranslationResult, TranslateParams, Translator } from "./translator";
import { createLogger, delay } from "../utils";
import { getMessage } from "../i18n";

export class Google extends Translator {
  public name = 'google';
  public title = 'Google';
  public apiUrl = 'https://translate.googleapis.com';
  public publicUrl = 'https://translate.google.com';
  public ttsMaxLength = 187;

  protected logger = createLogger({ systemPrefix: "[GOOGLE]" });
  protected apiClients = ["gtx", "dict-chrome-ex"];
  protected apiClient = createStorageHelper<string>("google_api_client", {
    defaultValue: this.apiClients[0],
  });

  constructor() {
    super(GoogleLanguages);
  }

  getFullPageTranslationUrl(pageUrl: string, lang: string): string {
    return `https://translate.google.com/translate?tl=${lang}&u=${pageUrl}`
  }

  // try to use next available api-client if google has blocked the traffic
  protected async refreshApiClient() {
    await delay(1000);

    var apiClient = this.apiClient.get();
    var index = this.apiClients.findIndex(client => client === apiClient);
    var nextApiClient = this.apiClients[index + 1] ?? this.apiClients[0];
    this.apiClient.set(nextApiClient);

    this.logger.info("api client refreshed", {
      oldValue: apiClient,
      newValue: nextApiClient,
    });
  }

  getAudioUrl(lang: string, text: string) {
    if (text.length > this.ttsMaxLength) return;
    var textEncoded = encodeURIComponent(text);
    var apiClient = this.apiClient.get();
    return this.apiUrl + `/translate_tts?client=${apiClient}&ie=UTF-8&tl=${lang}&q=${textEncoded}`;
  }

  async translate(params: TranslateParams): Promise<ITranslationResult> {
    await this.apiClient.load();

    var { from: langFrom, to: langTo, text } = params;
    var apiClientRefreshed = false;
    var requestInit: ProxyRequestInit = {
      method: "POST",
      headers: {
        "Content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams([
        ["client", this.apiClient.get()],
        ["source", "input"],
        ["dj", "1"],
        ["q", text],
        ["sl", langFrom],
        ["tl", langTo],
        ["hl", langTo], // header in dictionary for part of speech
        ["dt", "t"],    // translation
        ["dt", "bd"],   // dictionary
        ["dt", "rm"],   // translit (?)
        ["dt", "rw"],   // related words
        ["dt", "qca"],  // spelling correction
      ]).toString(),
    };
    var request = async (): Promise<ITranslationResult> => {
      var url = `${this.apiUrl}/translate_a/single`;
      var result: GoogleTranslation = await this.request({ url, requestInit });
      var { src, ld_result, sentences, dict, spell } = result;
      var sourceLanguages = ld_result?.srclangs ?? [];
      var detectedLang = src ?? sourceLanguages[0];
      var translation: ITranslationResult = {
        langDetected: detectedLang,
        translation: sentences.map(sentence => sentence.trans).join(''),
      };
      if (sourceLanguages.length > 1) {
        translation.sourceLanguages = sourceLanguages;
      }
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
                translation: entry.reverse_translation ?? [],
              }
            })
          }
        });
      }
      return translation;
    }

    try {
      return await request(); // waiting for response to handle error locally
    } catch (error) {
      if (isTranslationError(error)) {
        // TODO: handle 429 header "Retry-After" from response if provided
        // overwrite proxy error about invalid json-response (google returns html-page in that case)
        // SyntaxError: Unexpected token < in JSON at position 0
        const banFromGoogleForSuspiciousTraffic = [400, 429].includes(error.statusCode);
        if (banFromGoogleForSuspiciousTraffic) {
          error.message = [
            getMessage("service_unavailable"),
            getMessage("service_confirm_not_a_robot", {
              link: `<a href="https://translate.googleapis.com/translate_a/single" target="_blank">google link</a>`
            }),
          ].join(" ");
        }

        if (error.statusCode === 503 && !apiClientRefreshed) {
          apiClientRefreshed = true;
          return this.refreshApiClient().then(request);
        }
      }
      if (error) this.logger.error(error);
      throw error;
    }
  }
}

export interface GoogleTranslation {
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
      reverse_translation?: string[] // in source lang
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
    srclangs_confidences: number[]
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

Translator.createInstances.push(
  () => Translator.registerInstance(new Google()),
);
