import BingLanguages from "./bing.json"
import isEmpty from "lodash/isEmpty";
import groupBy from "lodash/groupBy";
import { ProxyRequestInit, ProxyResponseType } from "../extension";
import { ITranslationError, ITranslationResult, PageTranslator, ProviderCodeName, TranslateParams, TranslateParamsMany, Translator } from "./index";
import { createStorage } from "../storage";

export interface BingApiAuthParams {
  token: string; // jwt-token
  tokenExpiryTimeMs?: number;
}

class Bing extends Translator {
  public name = ProviderCodeName.BING;
  public title = "Bing";
  public publicUrl = "https://www.bing.com/translator";
  public authUrl = "https://edge.microsoft.com/translate/auth";
  public apiUrl = "https://api-edge.cognitive.microsofttranslator.com";

  constructor() {
    super({
      languages: BingLanguages,
      pageTranslator: new PageTranslator(),
    });
  }

  protected apiParams = createStorage<BingApiAuthParams>("bing_auth_params", {
    defaultValue: {} as BingApiAuthParams,
  });

  protected async beforeRequest() {
    await this.apiParams.load();

    const params = this.apiParams.get();
    if (isEmpty(params) || params.tokenExpiryTimeMs < Date.now()) {
      await this.refreshApiParams();
    }
  }

  private async refreshApiParams() {
    try {
      const token = await this.request<string>({
        url: this.authUrl,
        responseType: ProxyResponseType.TEXT,
      });

      const jwtPayload = JSON.parse(atob(token.split(".")[1])) as BingJwtPayload;
      const authParams: BingApiAuthParams = {
        token,
        tokenExpiryTimeMs: jwtPayload.exp * 1e3
      };

      this.apiParams.set(authParams);
    } catch (error) {
      throw new Error(`Failed to parse bing auth params: ${error}`);
    }
  }

  private async getRequestParams(params: TranslateParamsMany) {
    await this.beforeRequest();

    const { token } = this.apiParams.get();

    const requestInit: ProxyRequestInit = {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-type": "application/json; charset=UTF-8",
        "User-Agent": navigator.userAgent,
      },
      body: JSON.stringify(params.texts.map(text => ({ Text: text }))),
    };

    const queryParams = new URLSearchParams({
      "api-version": "3.0",
      to: params.langTo,
      from: params.langFrom !== "auto" ? params.langFrom : "",
    });

    return {
      requestInit,
      queryParams,
    };
  }

  async translateMany(params: TranslateParamsMany): Promise<string[]> {
    const { requestInit, queryParams } = await this.getRequestParams(params);

    const result: BingTranslation[] = await this.request({
      url: this.apiUrl + `/translate?${queryParams}`,
      requestInit,
    });

    return result.map(translation => translation.translations[0].text); // string[]
  }

  async translate({ from: langFrom, to: langTo, text }: TranslateParams): Promise<ITranslationResult> {
    const { requestInit, queryParams } = await this.getRequestParams({
      langFrom, langTo,
      texts: [text],
    });

    // API: https://learn.microsoft.com/en-gb/azure/ai-services/translator/reference/v3-0-translate
    const translationReq = async (): Promise<BingTranslation[]> => {
      return this.request({
        url: this.apiUrl + `/translate?${queryParams}`,
        requestInit,
      });
    };

    // API: https://learn.microsoft.com/en-gb/azure/ai-services/translator/reference/v3-0-dictionary-lookup
    const dictionaryReq = async (langFrom: string): Promise<BingDictionary[]> => {
      const modifiedQuery = new URLSearchParams(queryParams);
      modifiedQuery.set("from", langFrom);

      return this.request({
        url: this.apiUrl + `/dictionary/lookup?${modifiedQuery}`,
        requestInit,
      });
    };

    const request = async (): Promise<ITranslationResult> => {
      const response = await translationReq();

      const { translations, detectedLanguage } = response[0];
      const result: ITranslationResult = {
        langDetected: detectedLanguage?.language ?? langFrom,
        translation: translations.length ? translations[0].text : "",
      };

      if (text.split(" ").length > 3) {
        return result; // basic text translation, no dictionary lookup
      }

      // dictionary results
      const dictRes = await dictionaryReq(result.langDetected).catch(() => {
      });
      if (dictRes) {
        const dictGroups = groupBy<DictTranslation>(dictRes[0].translations, trans => trans.posTag)
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

export type BingJwtPayload = {
  region: string;
  "subscription-id": string;
  "product-id": string;
  "cognitive-services-endpoint": string;
  "azure-resource-id": string;
  scope: string;
  aud: string;
  exp: number;
  iss: string;
};

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

Translator.register(ProviderCodeName.BING, Bing);
