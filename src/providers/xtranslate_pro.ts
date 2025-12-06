import AILanguagesList from "./open-ai.json"
import { websiteURL } from "@/config";
import { getTranslator, ITranslationResult, OpenAIModelTTSVoice, ProviderCodeName, TranslateParams, Translator } from "./index";
import { ProxyResponseType } from "@/extension";

class XTranslatePro extends Translator {
  override name = ProviderCodeName.XTRANSLATE_PRO;
  override title = "XTranslate PRO";

  override publicUrl = websiteURL;
  override apiUrl = `${websiteURL}/api`;
  public authUrl = `${websiteURL}/api/auth/signin`;
  public userBullingPageUrl = `${websiteURL}/billing`;

  override isRequireApiKey = false;

  constructor() {
    super({
      languages: AILanguagesList,
    });
  }

  // TODO: implement me
  async translateMany(params: TranslateParams): Promise<string[]> {
    return [];
  }

  // TODO: implement me
  async translate(params: TranslateParams): Promise<ITranslationResult> {
    return;
  }

  // TODO: implement me
  async summarize(params: XTranslateProSummarizeInput): Promise<XTranslateProSummarizeOutput> {
    return;
  }

  // TODO: implement me
  async getAudioFile(text: string, lang?: string, voice?: OpenAIModelTTSVoice): Promise<Blob> {
    return;
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

export interface XTranslateProTranslateError {
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
