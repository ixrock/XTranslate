import BingLanguages from "./bing.json"
import groupBy from "lodash/groupBy";
import { ProxyRequestInit, ProxyResponseType } from "../extension";
import { isTranslationError, ITranslationError, ITranslationResult, ProviderCodeName, TranslateBatchResult, TranslateParams, Translator } from "./index";
import { createStorage } from "../storage";

const BING_TRANSLATOR_URL = "https://www.bing.com/translator";
const BING_API_URL = "https://www.bing.com";
const TOKEN_REFRESH_MARGIN_MS = 60e3;
const MAX_CONCURRENT_REQUESTS = 4;

export interface BingApiAuthParams {
  IG: string;
  IID: string;
  key: number;
  token: string;
  tokenExpiryTimeMs: number;
}

export function parseBingApiAuthParams(page: string): BingApiAuthParams {
  const IG = page.match(/IG:"([^"]+)"/)?.[1];
  const IID = page.match(/data-iid="([^"]+)"/)?.[1];
  const abusePreventionParams = page.match(/params_AbusePreventionHelper\s*=\s*(\[[^\]]+\])/)?.[1];

  if (!IG || !IID || !abusePreventionParams) {
    throw new Error("Bing Translator page does not contain the required API parameters");
  }

  const [key, token, tokenExpiryInterval] = JSON.parse(abusePreventionParams) as [number, string, number];
  if (!Number.isFinite(key) || !token || !Number.isFinite(tokenExpiryInterval)) {
    throw new Error("Bing Translator returned invalid API parameters");
  }

  return {
    IG,
    IID,
    key,
    token,
    tokenExpiryTimeMs: key + tokenExpiryInterval,
  };
}

class Bing extends Translator {
  override name = ProviderCodeName.BING;
  override title = "Bing";
  override publicUrl = BING_TRANSLATOR_URL;
  override apiUrl = BING_API_URL;
  override isRequireApiKey = false;

  private requestCount = 0;
  private refreshPromise?: Promise<void>;

  constructor() {
    super({
      languages: BingLanguages,
    });
  }

  protected apiParams = createStorage<BingApiAuthParams>("bing_auth_params", {
    defaultValue: {} as BingApiAuthParams,
  });

  private isApiParamsExpired(params: BingApiAuthParams) {
    return !params?.IG
      || !params.IID
      || !params.key
      || !params.token
      || !params.tokenExpiryTimeMs
      || params.tokenExpiryTimeMs - Date.now() < TOKEN_REFRESH_MARGIN_MS;
  }

  protected async beforeRequest() {
    await this.apiParams.load();

    if (this.isApiParamsExpired(this.apiParams.get())) {
      this.refreshPromise ??= this.refreshApiParams().finally(() => {
        this.refreshPromise = undefined;
      });
      await this.refreshPromise;
    }
  }

  private async refreshApiParams() {
    try {
      const page = await this.request<string>({
        url: this.publicUrl,
        responseType: ProxyResponseType.TEXT,
        requestInit: {
          headers: {
            "User-Agent": navigator.userAgent,
          },
        },
      });

      this.apiParams.set(parseBingApiAuthParams(page));
      this.requestCount = 0;
    } catch (error) {
      throw new Error(`Failed to refresh Bing API params: ${error}`);
    }
  }

  private getApiUrl(endpoint: "ttranslatev3" | "tlookupv3") {
    const { IG, IID } = this.apiParams.get();
    const queryParams = new URLSearchParams({
      isVertical: "1",
      IG,
      IID,
      SFX: String(++this.requestCount),
    });

    if (endpoint === "ttranslatev3") {
      queryParams.set("ref", "TThis");
      queryParams.set("edgepdftranslator", "1");
    }

    return `${this.apiUrl}/${endpoint}?${queryParams}`;
  }

  private getRequestInit(body: URLSearchParams): ProxyRequestInit {
    return {
      method: "POST",
      headers: {
        "Content-type": "application/x-www-form-urlencoded",
        "User-Agent": navigator.userAgent,
      },
      body: body.toString(),
    };
  }

  private getAuthBody() {
    const { key, token } = this.apiParams.get();
    return {
      key: String(key),
      token,
    };
  }

  private async translateText(text: string, langFrom: string, langTo: string): Promise<BingTranslation> {
    const body = new URLSearchParams({
      fromLang: langFrom === "auto" ? "auto-detect" : langFrom,
      to: langTo,
      text,
      ...this.getAuthBody(),
    });
    const response = await this.request<BingTranslation[] | BingWebApiError>({
      url: this.getApiUrl("ttranslatev3"),
      requestInit: this.getRequestInit(body),
    });

    if (!Array.isArray(response) || !response[0]?.translations?.length) {
      const apiError = response as BingWebApiError;
      throw {
        statusCode: apiError.statusCode ?? 500,
        message: apiError.errorMessage || "Bing returned an invalid translation response",
      } satisfies ITranslationError;
    }

    return response[0];
  }

  private async translateTexts(params: TranslateParams): Promise<BingTranslation[]> {
    await this.beforeRequest();

    const texts = params.texts ?? (params.text === undefined ? [] : [params.text]);
    const results = new Array<BingTranslation>(texts.length);
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < texts.length) {
        const index = nextIndex++;
        results[index] = await this.translateText(texts[index], params.from, params.to);
      }
    };

    const workerCount = Math.min(MAX_CONCURRENT_REQUESTS, texts.length);
    await Promise.all(Array.from({ length: workerCount }, worker));
    return results;
  }

  private toBatchResult(result: BingTranslation[]): TranslateBatchResult {
    const translation = result.map(item => item.translations[0].text);
    const detectedLangs = result
      .map(item => item.detectedLanguage?.language)
      .filter(Boolean);
    const detectedLang = detectedLangs.length && detectedLangs.every(lang => lang === detectedLangs[0])
      ? detectedLangs[0]
      : undefined;

    return { translation, detectedLang };
  }

  private async lookup(text: string, langFrom: string, langTo: string): Promise<BingDictionary[]> {
    const body = new URLSearchParams({
      from: langFrom,
      to: langTo,
      text,
      ...this.getAuthBody(),
    });

    return this.request({
      url: this.getApiUrl("tlookupv3"),
      requestInit: this.getRequestInit(body),
    });
  }

  async translateMany(params: TranslateParams): Promise<string[]> {
    return this.toBatchResult(await this.translateTexts(params)).translation;
  }

  async translateBatch(params: TranslateParams): Promise<TranslateBatchResult> {
    const result = this.toBatchResult(await this.translateTexts(params));
    return {
      ...result,
      translation: this.normalizeMany(params, result.translation),
    };
  }

  async translate(params: TranslateParams): Promise<ITranslationResult> {
    try {
      const [response] = await this.translateTexts(params);
      const { translations, detectedLanguage } = response;
      const result: ITranslationResult = {
        langDetected: detectedLanguage?.language ?? params.from,
        translation: translations[0].text,
      };

      if (params.text.split(" ").length <= 3) {
        const dictRes = await this.lookup(params.text, result.langDetected, params.to).catch((): undefined => undefined);
        if (dictRes?.[0]?.translations) {
          const dictGroups = groupBy<DictTranslation>(dictRes[0].translations, trans => trans.posTag);
          result.dictionary = Object.keys(dictGroups).map(wordType => ({
            wordType: wordType.toLowerCase(),
            meanings: dictGroups[wordType].map(trans => ({
              word: trans.displayTarget,
              translation: trans.backTranslations.map(item => item.displayText),
            })),
          }));
        }
      }

      return result;
    } catch (error) {
      if (isTranslationError(error)) throw error;
      throw {
        statusCode: 500,
        message: error instanceof Error ? error.message : String(error),
      } satisfies ITranslationError;
    }
  }
}

export interface BingTranslation {
  detectedLanguage?: {
    language: string;
    score: number;
  }
  translations: {
    text: string;
    to: string;
  }[];
}

export interface BingDictionary {
  displaySource: string
  normalizedSource: string
  translations: DictTranslation[]
}

interface BingWebApiError {
  statusCode?: number;
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

Translator.register(ProviderCodeName.BING, Bing);
