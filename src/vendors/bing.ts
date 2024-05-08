import BingLanguages from "./bing.json"
import { groupBy, isEmpty } from "lodash";
import { ProxyRequestInit, ProxyResponseType } from "../extension";
import { ITranslationError, ITranslationResult, TranslateParams, Translator } from "./translator";
import { createLogger } from "../utils";
import { createStorage } from "../storage";

export interface BingParsedGlobalParams {
  key: string;
  token: string;
  IG: string;
  IID: string;
  tokenExpiryTime?: number;
}

class Bing extends Translator {
  public name = 'bing';
  public title = 'Bing';
  public apiUrl = 'https://www.bing.com';
  public publicUrl = `${this.apiUrl}/translator`;

  constructor() {
    super(BingLanguages);
  }

  protected logger = createLogger({ systemPrefix: "[BING]" });
  protected apiGlobalParams = createStorage<BingParsedGlobalParams>("bing_api_global_params", {
    defaultValue: {} as BingParsedGlobalParams,
  });

  getFullPageTranslationUrl(pageUrl: string, lang: string): string {
    return `https://www.microsofttranslator.com/bv.aspx?to=${lang}&a=${pageUrl}`
  }

  protected getQueryApiParams(): string {
    const { IID, IG } = this.apiGlobalParams.get();

    return new URLSearchParams({
      IID, IG,
      isVertical: "1",
    }).toString();
  }

  protected async beforeRequest() {
    if (!this.apiGlobalParams.loaded) {
      await this.apiGlobalParams.load();
    }

    const params = this.apiGlobalParams.get();
    if (isEmpty(params) || params.tokenExpiryTime < Date.now()) {
      await this.refreshApiParams();
    }
  }

  protected async refreshApiParams() {
    try {
      const bingPageHtml = await this.request<string>({
        url: this.publicUrl,
        responseType: ProxyResponseType.TEXT,
        requestInit: {},
      });

      const matchedParams = bingPageHtml.match(/params_AbusePreventionHelper\s*=\s*(\[.*?])/)?.[1];
      const [timestamp, token, tokenTimeout] = JSON.parse(matchedParams);
      const IG = bingPageHtml.match(/IG:"([^"]+)"/)?.[1]
      const IID = bingPageHtml.match(/data-iid="([^"]+)"/)?.[1]
      const parsedGlobalParams: BingParsedGlobalParams = {
        key: timestamp,
        token,
        IID, IG,
        tokenExpiryTime: timestamp + tokenTimeout,
      };
      this.apiGlobalParams.set(parsedGlobalParams);
    } catch (error) {
      throw new Error(`Failed to parse global bing params: ${error}`);
    }
  }

  async translate(params: TranslateParams): Promise<ITranslationResult> {
    var { from: langFrom, to: langTo, text } = params;

    var reqInitCommon: ProxyRequestInit = {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-type": "application/x-www-form-urlencoded",
        "User-Agent": navigator.userAgent,
      }
    }
    var translationReq = async (langFrom: string): Promise<BingTranslation[]> => {
      const { key, token } = this.apiGlobalParams.get();
      const queryParams = this.getQueryApiParams();

      return this.request({
        url: this.apiUrl + `/ttranslatev3?${queryParams}`,
        requestInit: {
          ...reqInitCommon,
          body: new URLSearchParams({
            fromLang: langFrom === "auto" ? "auto-detect" : langFrom,
            to: langTo,
            text, key, token,
          }).toString(),
        }
      });
    };

    var dictionaryReq = async (langFrom: string): Promise<BingDictionary[]> => {
      const { key, token } = this.apiGlobalParams.get();
      const queryParams = this.getQueryApiParams();

      return this.request({
        url: this.apiUrl + `/tlookupv3?${queryParams}`,
        requestInit: {
          ...reqInitCommon,
          body: new URLSearchParams({
            from: langFrom,
            to: langTo,
            text, key, token,
          }).toString(),
        }
      });
    };

    var request = async (): Promise<ITranslationResult> => {
      await this.beforeRequest();
      const response = await translationReq(langFrom);

      const { translations, detectedLanguage } = response[0];
      const result: ITranslationResult = {
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
