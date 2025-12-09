import AILanguagesList from "./open-ai.json"
import { websiteURL } from "@/config";
import { getTranslator, ITranslationError, ITranslationResult, OpenAIModelTTSVoice, ProviderCodeName, TranslateParams, Translator } from "./index";
import { ProxyResponseType } from "@/extension";
import { getMessage } from "@/i18n";

export class XTranslatePro extends Translator {
  override name = ProviderCodeName.XTRANSLATE_PRO;
  override title = "XTranslate PRO";
  override isRequireApiKey = false;

  override publicUrl = websiteURL;
  override apiUrl = `${websiteURL}/api`;
  public subscribePageUrl = `${websiteURL}/subscribe`;

  constructor() {
    super({
      languages: AILanguagesList,
    });
  }

  private async translateReq(params: TranslateParams): Promise<XTranslateProTranslateOutput> {
    const { from, to: langTo, text, texts = [text] } = params;
    const langFrom = from === "auto" ? undefined : from;

    const payload: XTranslateProTranslateInput = {
      langFrom,
      langTo,
      text: texts,
    };

    return this.request<XTranslateProTranslateOutput>({
      url: `${this.apiUrl}/translate`,
      requestInit: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      }
    });
  }

  private handleApiError(err: Error | ITranslationError | XTranslateProTranslateError) {
    const apiError = err as ITranslationError & XTranslateProTranslateError;

    if (apiError.error) {
      apiError.message = apiError.error;
    }

    if (apiError.statusCode === 401) {
      apiError.message = getMessage("pro_unauthorized_error_401", {
        serviceUrl: `<a href="${this.subscribePageUrl}" target="_blank">${this.publicUrl}</a>`,
      });
    }

    throw apiError;
  }

  async translateMany(params: TranslateParams): Promise<string[]> {
    try {
      const { translation } = await this.translateReq(params);
      return translation;
    } catch (err) {
      this.handleApiError(err);
    }
  }

  async translate(params: TranslateParams): Promise<ITranslationResult> {
    try {
      const { translation, transcription, detectedLang } = await this.translateReq(params);
      return {
        langDetected: detectedLang,
        translation: translation.join("\n"),
        transcription: transcription
      };
    } catch (err) {
      this.handleApiError(err);
    }
  }

  async summarize(params: XTranslateProSummarizeInput): Promise<string> {
    try {
      const { summary } = await this.request<XTranslateProSummarizeOutput>({
        url: `${this.apiUrl}/summarize`,
        requestInit: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
          credentials: "include",
        }
      });
      return summary;
    } catch (err) {
      this.handleApiError(err);
    }
  }

  // FIXME: handle streaming properly
  async getAudioFile(text: string, lang?: string, voice?: OpenAIModelTTSVoice): Promise<Blob> {
    return this.request<Blob>({
      url: `${this.apiUrl}/tts`,
      requestInit: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang, voice }),
        credentials: "include",
      },
      responseType: ProxyResponseType.BLOB,
    });
  }

  async getUser(): Promise<XTranslateProUser> {
    return this.request<XTranslateProUser>({
      url: `${this.apiUrl}/me`,
      requestInit: { credentials: "include" },
      responseType: ProxyResponseType.JSON,
    });
  }
}

export interface XTranslateProTranslateInput {
  langFrom?: string;
  langTo: string;
  text: string[];
}

export interface XTranslateProTranslateOutput {
  detectedLang: string;
  translation: string[];
  transcription?: string;
  tokensTotalUsed: number;
}

export interface XTranslateProTranslateError extends ITranslationError {
  error: string;
}

export interface XTranslateProSummarizeInput {
  text: string;
  targetLang?: string;
}

export interface XTranslateProSummarizeOutput {
  summary: string;
  tokensTotalUsed: number;
}

export interface XTranslateProUser {
  username: string,
  email: string,
  image: string,
  subscription?: XTranslateProUserSubscription;
}

export interface XTranslateProUserSubscription {
  planType: "FREE_PLAN" | "MONTHLY" | "YEARLY";
  status: 'active' | 'inactive',
  periodStart: string, // iso-date
  periodEnd: string; // iso-date
  tokensRemain: number,
  ttsBytesRemain: number,
}

Translator.register(ProviderCodeName.XTRANSLATE_PRO, XTranslatePro);

export function getXTranslatePro() {
  return getTranslator<XTranslatePro>(ProviderCodeName.XTRANSLATE_PRO);
}