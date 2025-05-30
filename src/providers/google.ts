import GoogleLanguages from "./google.json"
import { ProxyRequestInit } from "../extension";
import { isTranslationError, ITranslationResult, ProviderCodeName, TranslateParams, Translator } from "./index";
import { delay } from "../utils";
import { getMessage } from "../i18n";
import { createStorage } from "../storage";

export const googleApiDomain = createStorage<string>("google_api_domain", {
  defaultValue: "com",
});

class Google extends Translator {
  override name = ProviderCodeName.GOOGLE;
  override title = 'Google';
  override publicUrl = 'https://translate.google.com';
  protected apiClients = ["gtx", "dict-chrome-ex"];
  protected ttsMaxLength = 187;
  override isRequireApiKey = false;

  protected apiClient = createStorage<string>("google_api_client", {
    defaultValue: this.apiClients[0],
  });

  constructor() {
    super({
      languages: GoogleLanguages,
    });
  }

  get apiUrl() {
    const domain = googleApiDomain.get();
    return this.publicUrl.replace(".com", "." + domain);
  }

  // try to use next available api-client if google has blocked the traffic
  protected async refreshApiClient() {
    await delay(1000);

    const apiClient = this.apiClient.get();
    const index = this.apiClients.findIndex(client => client === apiClient);
    const nextApiClient = this.apiClients[index + 1] ?? this.apiClients[0];
    this.apiClient.set(nextApiClient);

    this.logger.info("google api client refreshed", {
      oldValue: apiClient,
      newValue: nextApiClient,
    });
  }

  getAudioUrl(text: string, lang: string) {
    if (text.length > this.ttsMaxLength) return;
    const textEncoded = encodeURIComponent(text);
    const apiClient = this.apiClient.get();
    return this.apiUrl + `/translate_tts?client=${apiClient}&ie=UTF-8&tl=${lang}&q=${textEncoded}`;
  }

  async translateMany({ from: langFrom, to: langTo, texts }: TranslateParams): Promise<string[]> {
    const queryParams = new URLSearchParams({
      client: this.apiClient.get(),
      sl: langFrom,
      tl: langTo
    });

    const requestInit: ProxyRequestInit = {
      method: "POST",
      headers: {
        "Content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(
        texts.map(text => ["q", text])
      ).toString(),
    };

    const url = `${this.apiUrl}/translate_a/t?${queryParams}`;
    const response = await this.request({ url, requestInit });
    const translations: string[] = [];

    if (langFrom === "auto") {
      const autoDetectedResults = response as [text: string, locale: string][];
      translations.push(...autoDetectedResults.map(([text]) => text));
    } else {
      translations.push(...response as string[]);
    }

    return translations;
  }

  async translate(params: TranslateParams): Promise<ITranslationResult> {
    await googleApiDomain.load();
    await this.apiClient.load();

    const { from: langFrom, to: langTo, text } = params;
    let apiClientRefreshed = false;

    const requestInit: ProxyRequestInit = {
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

    const request = async (): Promise<ITranslationResult> => {
      const url = `${this.apiUrl}/translate_a/single`;
      const result: GoogleTranslation = await this.request({ url, requestInit });
      const { ld_result, sentences, dict, spell } = result;
      const sourceLanguages = ld_result?.srclangs ?? [];

      const translation: ITranslationResult = {
        langDetected: sourceLanguages[0] ?? result.src,
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

export interface GoogleApiDomain {
  domain: string;
  title: string;
}

export const googleApiDomains: GoogleApiDomain[] = [
  { domain: "com", title: "com (Default)" },
  { domain: "ca", title: "ca (Canada)" },
  { domain: "com.hk", title: "com.hk (香港)" },
  { domain: "com.tr", title: "com.tr (Türkiye)" },
  { domain: "com.tw", title: "com.tw (台湾)" },
  { domain: "com.ua", title: "com.ua (Україна)" },
  { domain: "com.vn", title: "com.vn (Việt Nam)" },
  { domain: "co.in", title: "co.in (India)" },
  { domain: "co.jp", title: "co.jp (日本)" },
  { domain: "co.kr", title: "co.kr (한국)" },
  { domain: "co.uk", title: "co.uk (UK)" },
  { domain: "cn", title: "cn (中国)" },
  { domain: "de", title: "de (Deutschland)" },
  { domain: "fr", title: "fr (France)" },
  { domain: "it", title: "it (Italia)" },
  { domain: "pl", title: "pl (Polska)" },
  { domain: "ru", title: "ru (Россия)" }
];

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

Translator.register(ProviderCodeName.GOOGLE, Google);