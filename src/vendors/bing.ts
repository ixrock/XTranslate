import BingLanguages from "./bing.json"
import { groupBy } from "lodash";
import { createStorageHelper, ProxyRequestInit, ProxyResponseType } from "../extension";
import { isTranslationError, ITranslationError, ITranslationResult, TranslateParams, Translator } from "./translator";
import { createLogger } from "../utils";

class Bing extends Translator {
  public name = 'bing';
  public title = 'Bing';
  public apiUrl = 'https://www.bing.com';
  public publicUrl = `${this.apiUrl}/translator`;

  constructor() {
    super(BingLanguages);
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
      current: this.apiClient.toJS()
    });
    try {
      const servicePageText = await this.request<string>({
        url: this.publicUrl,
        responseType: ProxyResponseType.TEXT,
        requestInit: {},
      });
      const matchedParams = /params_RichTranslateHelper\s*=\s*\[(\d+),"(.*?)",.*?\]/.exec(servicePageText);
      if (matchedParams) {
        const [page, key, token] = matchedParams;
        this.logger.info(`api client updated`, { key, token });
        this.apiClient.set({ key, token });
      }
    } catch (error) {
      this.logger.error('refreshing api failed', error);
    }
  }

  async translate(params: TranslateParams): Promise<ITranslationResult> {
    var { from: langFrom, to: langTo, text } = params;
    var apiClientRefreshed = false;

    var reqInitCommon: ProxyRequestInit = {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-type": "application/x-www-form-urlencoded"
      }
    }
    var translationReq = (langFrom: string): Promise<BingTranslation[]> => {
      return this.request({
        url: this.apiUrl + "/ttranslatev3",
        requestInit: {
          ...reqInitCommon,
          body: new URLSearchParams({
            fromLang: langFrom === "auto" ? "auto-detect" : langFrom,
            to: langTo,
            text: text,
            ...this.apiClient.get(),
          }).toString(),
        }
      });
    };

    var dictionaryReq = (langFrom: string): Promise<BingDictionary[]> => {
      var url = this.apiUrl + '/tlookupv3';
      return this.request({
        url: url,
        requestInit: {
          ...reqInitCommon,
          body: new URLSearchParams({
            from: langFrom,
            to: langTo,
            text: text,
            ...this.apiClient.get(),
          }).toString(),
        }
      });
    };

    var request = async (): Promise<ITranslationResult> => {
      var response = await translationReq(langFrom);

      // bing errors comes with normal http-status == 200 via proxy fetch
      if (isTranslationError(response)) {
        if (response.statusCode === 400 && !apiClientRefreshed) {
          apiClientRefreshed = true;
          return this.refreshApiClient().then(request);
        }
        this.logger.error(response);
        throw response;
      }

      var { translations, detectedLanguage } = response[0];
      var result: ITranslationResult = {
        langDetected: detectedLanguage.language,
        translation: translations.length ? translations[0].text : "",
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
  statusCode: number;
  errorMessage: string;
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

Translator.createInstances.push(
  () => Translator.registerInstance(new Bing()),
);
