import DeeplLanguages from "./deepl.json"
import { ITranslationError, ITranslationResult, sanitizeApiKey, TranslateParams, Translator, TranslatorLanguages, VendorCodeName } from "./index";
import { createStorage } from "../storage";
import { ProxyRequestInit } from "../extension";
import { getMessage } from "../i18n";
import type { VendorAuthSettingsProps } from "../components/settings/vendor_auth_settings";

class Deepl extends Translator {
  public name = VendorCodeName.DEEPL;
  public title = "DeepL";
  public publicUrl = "https://www.deepl.com/translator";

  constructor() {
    super(DeeplLanguages);
  }

  get apiUrl() {
    const apiKey = this.#apiKey.get();
    const isFreeKey = apiKey?.endsWith(":fx");

    if (isFreeKey || !apiKey) {
      return "https://api-free.deepl.com/v2";
    }
    return "https://api.deepl.com/v2";
  }

  #apiKey = createStorage("deepl_api_auth_key", {
    defaultValue: "", // free or paid subscription key (example: "b05afc95-d4ea-2bee-07e6-e81469c588f2:fx")
  });

  private setupAuthApiKey = () => {
    const newKey = window.prompt("DeepL API Key");
    if (newKey === null) return;
    this.#apiKey.set(newKey || this.#apiKey.defaultValue);
  };

  async translate(params: TranslateParams): Promise<ITranslationResult> {
    const { from: langFrom, to: langTo, text } = params;
    const reqInit: ProxyRequestInit = {
      method: "POST",
      headers: {
        "Authorization": `DeepL-Auth-Key ${this.#apiKey.get()}`,
        "Content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        text,
        source_lang: langFrom == "auto" ? "" : langFrom,
        target_lang: langTo,
      } as DeeplTranslationRequestParams).toString(),
    };

    try {
      const { translations }: DeeplTranslationResponse = await this.request({
        url: `${this.apiUrl}/translate`,
        requestInit: reqInit,
      });
      return {
        langDetected: translations[0].detected_source_language.toLowerCase(),
        translation: translations[0].text,
      };
    } catch (error: ITranslationError | any) {
      let { statusCode, message } = error as ITranslationError;

      if (statusCode === DeeplErrorCode.AUTH_FAILED) {
        message = getMessage("error_403_auth_failed");
      }

      throw {
        statusCode,
        message,
      };
    }
  }

  async getDataUsage(): Promise<DeeplUsageResponse> {
    const url = `${this.apiUrl}/usage?auth_key=${this.#apiKey.get()}`;
    return this.request({ url });
  }

  async getSupportedLanguages(type: "source" | "target"): Promise<DeeplSupportedLanguage[]> {
    const url = `${this.apiUrl}/languages?type=${type}&auth_key=${this.#apiKey.get()}`;
    return this.request({ url });
  }

  getAuthSettings(): VendorAuthSettingsProps {
    return {
      className: "deepl-settings",
      apiKeySanitized: sanitizeApiKey(this.#apiKey.get()),
      setupApiKey: this.setupAuthApiKey,
      clearApiKey: () => this.#apiKey.set(""),
      accessInfo: getMessage("deepl_get_own_key_info"),
      accessInfo2: getMessage("deepl_insert_auth_key"),
      warningInfo: getMessage("deepl_insert_auth_key_warning"),
      clearKeyInfo: getMessage("deepl_insert_auth_key_remove"),
    };
  }
}

// See also: https://www.deepl.com/docs-api/other-functions/monitoring-usage/
export interface DeeplUsageResponse {
  character_count: number;
  character_limit: number;
}

// See also: https://www.deepl.com/docs-api/translating-text/request/
export interface DeeplTranslationRequestParams {
  [param: string]: string;

  // Text to be translated. Only UTF8-encoded plain text is supported.
  // The parameter may be specified multiple times and translations are returned in the same order as they are requested.
  // Up to 50 texts can be sent for translation in one request.
  text: string;

  // Language of the text to be translated. When param omitted language auto-detection is applied.
  source_lang?: string;

  // The language into which the text should be translated.
  target_lang: string;

  // Sets whether the translation engine should first split the input into sentences.
  split_sentences?: "0" | "1" /*default*/ | "nonewlines";

  // Sets whether the translation engine should respect the original formatting, even if it would usually correct some aspects.
  preserve_formatting?: "0" /*default*/ | "1";

  // Sets whether the translated text should lean towards formal or informal language.
  // This feature currently only works for target languages "DE" (German), "FR" (French), "IT" (Italian), "ES" (Spanish), "NL" (Dutch), "PL" (Polish), "PT-PT", "PT-BR" (Portuguese) and "RU" (Russian).
  formality?: "default" | "more" | "less";

  // Specify the glossary to use for the translation.
  // This requires the "source_lang" parameter to be set and the language pair of the glossary has to match the language pair of the request.
  glossary_id?: string;
}

export interface DeeplTranslation {
  detected_source_language: string;
  text: string;
}

export interface DeeplTranslationResponse {
  translations: DeeplTranslation[];
}

// See also: https://www.deepl.com/docs-api/accessing-the-api/error-handling/
export const enum DeeplErrorCode {
  BAD_REQUEST = 400, //	Bad request. Please check error message and your parameters
  AUTH_FAILED = 403, //	Authorization failed. Please supply a valid auth_key parameter
  NOT_FOUND = 404, //	The requested resource could not be found.
  REQUEST_EXCEED_LIMIT = 413, // The request size exceeds the limit (< 30Kb)
  REQUEST_TOO_LONG = 414, // The request URL is too long. You can avoid this error by using a POST request instead of a GET request, and sending the parameters in the HTTP body
  TOO_MANY_REQUESTS = 429, // Too many requests. Please wait and resend your request
  QUOTA_EXCEED = 456, //	Quota exceeded. The character limit has been reached
  SERVICE_BREAK = 503, //	Resource currently unavailable. Try again later
}

// See more: https://www.deepl.com/docs-api/other-functions/listing-supported-languages/
export interface DeeplSupportedLanguage {
  language: string; // The language code of the given language, e.g. "EN-US"
  name: string; // Name of the language in English.
  supports_formality?: boolean; // Only included for target languages
}

/**
 * Dumps to console supported list of languages by Deepl API
 */
export async function dump_deepl_json() {
  const supportedLanguages: TranslatorLanguages = {
    from: { "auto": "Auto-detect" },
    to: {},
  };
  const deepl = new Deepl();
  const from = await deepl.getSupportedLanguages("source");
  const to = await deepl.getSupportedLanguages("target");
  from.forEach(({ name, language }) => supportedLanguages.from[language.toLowerCase()] = name);
  to.forEach(({ name, language }) => supportedLanguages.to[language.toLowerCase()] = name);
  console.info("[[Deepl]]: supported languages", supportedLanguages);
}

Translator.registerVendor(Deepl);