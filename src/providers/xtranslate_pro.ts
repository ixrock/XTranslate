import AILanguagesList from "./open-ai.json"
import { getTranslator, ITranslationError, ITranslationResult, OpenAIModelTTSVoice, ProviderCodeName, TranslateParams, Translator } from "./index";
import { MessageType, ProxyResponseType, ProxyStreamResponsePayload } from "@/extension";
import { getMessage } from "@/i18n";
import { websiteURL } from "@/config";
import { userStore } from "@/pro";

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

  private ttsPort?: chrome.runtime.Port;

  override async speak(text: string, lang?: string, voice?: OpenAIModelTTSVoice): Promise<HTMLAudioElement | SpeechSynthesisUtterance | void> {
    voice ??= userStore.data.ttsVoice; // use default value from app's UI settings

    return super.speak(text, lang, voice);
  }

  override stopSpeaking() {
    super.stopSpeaking();
    this.ttsPort?.disconnect();
  }

  async getAudioFile(text: string, lang?: string, voice?: OpenAIModelTTSVoice): Promise<Blob> {
    this.logger.info("attempt for text-to-speech with params", { text, lang, voice });

    return await this.request<Blob>({
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
      this.ttsPort = chrome.runtime.connect({
        name: MessageType.HTTP_PROXY_STREAM,
      });

      const queue: Uint8Array[] = [];
      let sourceBuffer: SourceBuffer | undefined;
      let portFinished = false;
      let streamStarted = false;
      let isResolved = false;
      let audioStarted = false;

      const resolveOnce = (result: boolean) => {
        if (isResolved) return;
        isResolved = true;
        resolve(result);
      };

      const endOfStream = () => {
        if (mediaSource.readyState !== "open") return;
        try {
          mediaSource.endOfStream();
        } catch {
          /* ignore */
        }
      };

      const processQueue = () => {
        if (!sourceBuffer || sourceBuffer.updating) return;

        if (queue.length > 0) {
          try {
            sourceBuffer.appendBuffer(queue.shift() as BufferSource);
          } catch (error) {
            this.logger.error("[TTS-STREAM]: SourceBuffer append failed", error);
            resolveOnce(false);
            this.ttsPort?.disconnect();
          }
          return;
        }

        if (portFinished) {
          endOfStream();
        }
      };

      mediaSource.addEventListener("sourceopen", () => {
        try {
          sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
        } catch (error) {
          this.logger.error("[TTS-STREAM]: SourceBuffer init failed", error);
          resolveOnce(false);
          this.ttsPort?.disconnect();
          return;
        }

        sourceBuffer.addEventListener("updateend", () => {
          processQueue();
        });
        processQueue();
      }, { once: true });

      this.ttsPort.onDisconnect.addListener(() => {
        if (!streamStarted) {
          resolveOnce(false);
        }
      });

      this.ttsPort.onMessage.addListener((msg: ProxyStreamResponsePayload) => {
        if ("error" in msg && msg.error) {
          this.logger.error("[TTS-STREAM]", {
            error: msg.error,
            statusCode: msg.statusCode,
            statusText: msg.statusText,
          });
          portFinished = true;
          endOfStream();
          resolveOnce(false);
          this.ttsPort?.disconnect();
          return;
        }

        if ("statusCode" in msg && msg.statusCode >= 400) {
          this.logger.error("[TTS-STREAM]", {
            statusCode: msg.statusCode,
            statusText: msg.statusText,
          });
          portFinished = true;
          endOfStream();
          resolveOnce(false);
          this.ttsPort?.disconnect();
          return;
        }

        if ("chunk" in msg && msg.chunk?.length) {
          const chunk = new Uint8Array(msg.chunk);
          queue.push(chunk);
          streamStarted = true;
          processQueue();

          if (!audioStarted) {
            audioStarted = true;
            resolveOnce(true);
            void this.audio.play().catch((error: unknown): void => {
              this.logger.info("[TTS-STREAM]: autoplay was blocked", error);
            });
          }
          return;
        }

        if ("done" in msg && msg.done) {
          portFinished = true;
          processQueue();
          if (!streamStarted) {
            resolveOnce(false);
          }
          this.ttsPort?.disconnect();
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

  async loadPricing(): Promise<XTranslateProPricing> {
    return this.request({
      url: `${this.apiUrl}/pricing`,
    });
  }

  async loadUser(): Promise<XTranslateProUser> {
    return this.request({
      url: `${this.apiUrl}/user`,
      requestInit: { credentials: "include" },
    });
  }

  async loadSubscription(): Promise<XTranslateProSubscription> {
    return this.request({
      url: `${this.apiUrl}/user/plan`,
      requestInit: { credentials: "include" },
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
  username: string;
  email: string;
  image: string;
}

export type XTranslateProPricing = Record<XTranslateProPlanType, XTranslateProPlan>;

export interface XTranslateProPlan {
  stripePriceId?: string;
  priceCentsUSD: number;
  textTokensIncluded: number
  ttsBytesIncluded: number;
}

export type XTranslateProPlanType = "FREE_PLAN" | "MONTHLY" | "YEARLY";
export type XTranslateProStatus = "PAID" | "FAILED" | "REFUNDED" | "CANCELED";

export interface XTranslateProSubscription {
  status: 'active' | 'inactive';
  planType: XTranslateProPlanType;
  cycleStatus: XTranslateProStatus;
  periodStart: string, // iso-date
  periodEnd: string; // iso-date
  tokensRemain: number,
  ttsBytesRemain: number,
}

Translator.register(ProviderCodeName.XTRANSLATE_PRO, XTranslatePro);

export function getXTranslatePro() {
  return getTranslator<XTranslatePro>(ProviderCodeName.XTRANSLATE_PRO);
}
