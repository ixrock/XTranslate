import DeeplLanguages from "./deepl.json";
import { getMessage } from "../i18n";
import { createStorage } from "../storage";
import { ProviderCodeName } from "./providers";
import { ITranslationError, ITranslationResult, isTranslationError, TranslateParams, Translator } from "./translator";

export const DEEPL_API_FREE_URL = "https://api-free.deepl.com/v2";
export const DEEPL_API_PRO_URL = "https://api.deepl.com/v2";
export const DEEPL_MAX_TEXTS_PER_REQUEST = 50;
export const DEEPL_MAX_REQUEST_BYTES = 128 * 1024;

interface DeeplRequestParams {
  from: string;
  to: string;
  texts: string[];
}

export interface DeeplTranslation {
  detected_source_language: string;
  text: string;
}

export interface DeeplTranslationResponse {
  translations: DeeplTranslation[];
}

export const deeplApiAuthKey = createStorage<string>("deepl_api_auth_key", { area: "local" });

export function getDeeplApiUrl(apiKey?: string): string {
  return !apiKey || apiKey.endsWith(":fx") ? DEEPL_API_FREE_URL : DEEPL_API_PRO_URL;
}

export function sanitizeDeeplApiKey(apiKey: string): string {
  if (!apiKey) return "";
  if (apiKey.length <= 8) return "*".repeat(apiKey.length);
  return `${apiKey.slice(0, 4)}*-*${apiKey.slice(-4)}`;
}

function createDeeplRequestBody({ from, to, texts }: DeeplRequestParams): string {
  const body: Record<string, string | string[]> = {
    text: texts,
    target_lang: to.toUpperCase(),
  };
  if (from !== "auto") {
    body.source_lang = from.toUpperCase();
  }
  return JSON.stringify(body);
}

export function createDeeplRequest(apiKey: string, params: DeeplRequestParams) {
  const body = createDeeplRequestBody(params);
  if (new TextEncoder().encode(body).byteLength > DEEPL_MAX_REQUEST_BYTES) {
    throw Object.assign(new Error("DeepL API request exceeds the 128 KiB limit."), {
      statusCode: 413,
    });
  }

  return {
    url: `${getDeeplApiUrl(apiKey)}/translate`,
    requestInit: {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
    },
  };
}

function packDeeplTextGroups(params: DeeplRequestParams): string[][] {
  const groups: string[][] = [];
  let group: string[] = [];

  for (const text of params.texts) {
    const candidate = [...group, text];
    const requestBytes = new TextEncoder().encode(
      createDeeplRequestBody({ ...params, texts: candidate })
    ).byteLength;
    const exceedsLimit = candidate.length > DEEPL_MAX_TEXTS_PER_REQUEST || requestBytes > DEEPL_MAX_REQUEST_BYTES;

    if (group.length && exceedsLimit) {
      groups.push(group);
      group = [text];
    } else {
      group = candidate;
    }
  }

  if (group.length) {
    groups.push(group);
  }
  return groups;
}

export class Deepl extends Translator {
  override name = ProviderCodeName.DEEPL;
  override title = "DeepL";
  override publicUrl = "https://www.deepl.com/translator";

  constructor() {
    super({ languages: DeeplLanguages });
  }

  get apiUrl() {
    return getDeeplApiUrl(deeplApiAuthKey.get());
  }

  protected async requestTranslations(params: DeeplRequestParams): Promise<DeeplTranslationResponse> {
    await deeplApiAuthKey.load();
    const apiKey = deeplApiAuthKey.get();
    if (!apiKey) {
      throw {
        statusCode: 403,
        message: getMessage("error_403_auth_failed"),
      } as ITranslationError;
    }

    try {
      return await this.request<DeeplTranslationResponse>(createDeeplRequest(apiKey, params));
    } catch (error) {
      if (isTranslationError(error)) {
        if (error.statusCode === 403) {
          error.message = getMessage("error_403_auth_failed");
        } else if (error.statusCode === 456) {
          error.message = "DeepL API quota exceeded.";
        } else if (error.statusCode === 429) {
          error.message = "DeepL API rate limit exceeded. Please try again later.";
        }
      }
      throw error;
    }
  }

  async translate({ from, to, text }: TranslateParams): Promise<ITranslationResult> {
    const { translations } = await this.requestTranslations({ from, to, texts: [text] });
    const [translation] = translations;

    return {
      translation: translation.text,
      langDetected: translation.detected_source_language.toLowerCase(),
    };
  }

  async translateMany({ from, to, texts }: TranslateParams): Promise<string[]> {
    const groups = packDeeplTextGroups({ from, to, texts });
    const responses = await Promise.all(
      groups.map(group => this.requestTranslations({ from, to, texts: group }))
    );
    return responses.flatMap(({ translations }) => translations.map(({ text }) => text));
  }
}

Translator.register(ProviderCodeName.DEEPL, Deepl);
