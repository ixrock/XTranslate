import { groupBy } from "lodash";
import BingTranslateParams from "./bing.json"
import { ITranslationError, ITranslationResult, Translator } from "./translator";
import { createStorageHelper } from "../extension/storage";
import { createLogger } from "../utils";

class Bing extends Translator {
  public name = 'bing';
  public title = 'Bing';
  public apiUrl = 'https://www.bing.com';
  public publicUrl = `${this.apiUrl}/translator`;
  public textMaxLength = 5000;

  constructor() {
    super(BingTranslateParams);
  }

  protected logger = createLogger({ systemPrefix: "[BING]" });
  protected apiClient = createStorageHelper<{ key?: string, token?: string }>("bing_api_client", {
    defaultValue: {},
  });

  getFullPageTranslationUrl(pageUrl: string, lang: string): string {
    return `https://www.microsofttranslator.com/bv.aspx?to=${lang}&a=${pageUrl}`
  }

  protected async refreshApiClient() {
    this.logger.info('refreshing api client..', {
      oldValue: this.apiClient.toJS(),
    });
    try {
      const servicePage = await fetch(this.publicUrl, { credentials: 'include' }).then(res => res.text());
      const matchedParams = /params_RichTranslateHelper\s*=\s*\[(\d+),"(\w+)",\d+,.*?\]/.exec(servicePage);
      if (matchedParams) {
        const [pageText, key, token] = matchedParams;
        this.logger.info(`api client updated`, { key, token });
        await this.apiClient.set({ key, token });
      }
    } catch (error) {
      this.logger.error('refreshing api error', error);
    }
  }

  protected translate(langFrom, langTo, text): Promise<ITranslationResult> {
    var reqInitBase: RequestInit = {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      }
    }
    var translationReq = (langFrom: string): Promise<BingTranslation[]> => {
      var url = this.apiUrl + "/ttranslatev3";
      return fetch(url, {
        ...reqInitBase,
        body: new URLSearchParams({
          fromLang: langFrom === "auto" ? "auto-detect" : langFrom,
          to: langTo,
          text: text,
          ...this.apiClient.get(),
        }),
      }).then(this.parseJson);
    };

    var dictionaryReq = (langFrom: string): Promise<BingDictionary[]> => {
      var url = this.apiUrl + '/tlookupv3';
      return fetch(url, {
        ...reqInitBase,
        body: new URLSearchParams({
          from: langFrom,
          to: langTo,
          text: text,
          ...this.apiClient.get(),
        }),
      }).then(this.parseJson);
    };

    var apiClientRefreshed = false;
    var request = async () => {
      try {
        var transRes = await translationReq(langFrom);
        var { translations, detectedLanguage } = transRes[0];
        var result: ITranslationResult = {
          langDetected: detectedLanguage.language,
          translation: translations.length ? translations[0].text : "",
          dictionary: []
        };

        // dictionary results
        var dictRes = await dictionaryReq(result.langDetected).catch(() => null);
        if (dictRes) {
          var dictGroups = groupBy<DictTranslation>(dictRes[0].translations, trans => trans.posTag)
          result.dictionary = Object.keys(dictGroups).map(wordType => {
            return {
              wordType: wordType.toLowerCase(),
              meanings: dictGroups[wordType].map(trans => {
                return {
                  word: trans.displayTarget,
                  translation: trans.backTranslations.map(item => item.displayText),
                }
              })
            }
          });
        }
        return result;
      } catch (error) {
        if (!apiClientRefreshed) {
          apiClientRefreshed = true;
          return this.refreshApiClient().then(request);
        }
        throw error;
      }
    };

    return request();
  }
}

export interface BingTranslation {
  detectedLanguage: {
    language: string;
    score: number;
  }
  translations: {
    text: string;
    to: string;
    transliteration?: {
      script?: string;
      text?: string
    }
  }[];
}

export interface BingDictionary {
  displaySource: string
  normalizedSource: string
  translations: DictTranslation[]
}

export interface BingTranslationError extends ITranslationError {
  errorMessage?: string;
}

interface DictTranslation {
  posTag: string
  displayTarget: string
  normalizedTarget: string
  prefixWord: string
  confidence: number
  backTranslations: {
    displayText: string
    normalizedText: string
    numExamples: number
    frequencyCount: number
  }[]
}

const bing = new Bing();
Translator.register(bing.name, bing);
