import AILanguagesList from "./open-ai.json"
import { websiteURL } from "@/config";
import { getTranslator, ITranslationError, ITranslationResult, OpenAIModelTTSVoice, ProviderCodeName, TranslateParams, Translator } from "./index";
import { MessageType, ProxyResponseType } from "@/extension";
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

  private ttsPort: chrome.runtime.Port;

  override stopSpeaking() {
    super.stopSpeaking();
    this.ttsPort?.disconnect();
  }

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

  override async streamAudio(text: string, lang?: string, voice?: OpenAIModelTTSVoice): Promise<boolean> {
    if (!window.MediaSource || !MediaSource.isTypeSupported("audio/mpeg")) {
      return false;
    }

    const mediaSource = new MediaSource();
    this.audio = document.createElement("audio");
    this.audio.src = this.audioDataUrl = URL.createObjectURL(mediaSource);

    return new Promise((resolve) => {
      this.ttsPort = chrome.runtime.connect({ name: MessageType.HTTP_PROXY_STREAM });

      const queue: Uint8Array[] = [];
      let sourceBuffer: SourceBuffer;
      let portFinished = false;

      const processQueue = () => {
        if (queue.length > 0 && sourceBuffer && !sourceBuffer.updating) {
          try {
            sourceBuffer.appendBuffer(queue.shift() as BufferSource);
          } catch (e) {
            this.logger.error("SourceBuffer append failed", e);
          }
        }
      };

      mediaSource.addEventListener("sourceopen", () => {
        sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
        sourceBuffer.addEventListener("updateend", () => {
          processQueue();
          if (queue.length === 0 && portFinished) {
            try {
              mediaSource.endOfStream();
            } catch (e) { /* ignore */ }
          }
        });
      });

      let audioStarted = false;

      this.ttsPort.onMessage.addListener((msg) => {
        if (msg.error) {
          this.logger.error("[TTS-STREAM]", msg.error);
          this.ttsPort.disconnect();
          resolve(false); // Fallback
          return;
        }

        if (msg.chunk) {
          const chunk = new Uint8Array(msg.chunk);
          queue.push(chunk);
          processQueue();

          // Resolve success on first chunk
          resolve(true);
          if (!audioStarted) {
            audioStarted = true;
            this.audio.play().catch(() => {});
          }
        }

        if (msg.done) {
          portFinished = true;
          if (queue.length === 0 && sourceBuffer && !sourceBuffer.updating) {
            try {
              mediaSource.endOfStream();
            } catch (e) { /* ignore */ }
          }
          this.ttsPort.disconnect();
        }
      });

      // init api streaming request and start playing tts-audio asap
      this.ttsPort.postMessage({
        url: `${this.apiUrl}/tts`,
        requestInit: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, lang, voice }),
          credentials: "include",
        }
      });
    });
  }

  async getUser(): Promise<XTranslateProUserResponse> {
    return this.request<XTranslateProUserResponse>({
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
  pricing: XTranslatePricing;
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

export interface XTranslateProUserResponse {
  user?: XTranslateProUser;
  pricing: XTranslatePricing;
}

export interface XTranslatePricing {
  freeTokens: number,
  freeTtsBytes: number;
  monthlyPriceCentsUSD: number;
  monthlyTokens: number;
  monthlyTtsBytes: number;
  yearlyTokens: number;
  yearlyTtsBytes: number;
  yearlyPriceCentsUSD: number;
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