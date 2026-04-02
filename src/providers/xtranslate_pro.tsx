import React from "react";
import AILanguagesList from "./open-ai.json"
import { action } from "mobx";
import { getTranslator, ITranslationDictionary, ITranslationError, ITranslationResult, OpenAIModelTTSVoice, ProviderCodeName, TranslateParams, Translator } from "./index";
import { MessageType, ProxyResponseType, ProxyStreamResponsePayload } from "@/extension";
import { supportEmail, websiteURL } from "@/config";
import { sendMetric } from "@/background/metrics.bgc";
import { createStorage } from "@/storage";
import { getMessage } from "@/i18n";
import { userStore } from "@/pro";

export const freeTrialStorage = createStorage("xtranslate_pro_trial", {
  area: "sync",
  autoLoad: true,
  saveDefaultWhenEmpty: true,
  defaultValue: {
    anonId: crypto.randomUUID?.() ?? Math.random().toString(36).substring(2),
    todayRemain: 2,
    totalRemain: 5,
    finished: false,
    showBanner: true,
  },
});

export class XTranslatePro extends Translator {
  static ERROR_CODE_LIMIT_REACHED = "LIMIT_REACHED";
  static ERROR_CODE_INPUT_TOO_LARGE_ERROR = "INPUT_TOO_LARGE";

  override name = ProviderCodeName.XTRANSLATE_PRO;
  override title = "XTranslate PRO";
  override isRequireApiKey = false;

  override publicUrl = websiteURL;
  override apiUrl = `${websiteURL}/api`;
  public subscribePageUrl = `${websiteURL}/subscribe`;
  public loginUrl = `${websiteURL}/api/auth/signin?callbackUrl=/billing`;

  private ttsPort?: chrome.runtime.Port;
  private static readonly ttsCacheTtlMs = 24 * 60 * 60 * 1000; // 24h
  private static readonly ttsCacheStoragePrefix = "xtranslate_pro_tts_cache";
  private static readonly ttsMemoryCache = new Map<string, XTranslateProMemoryTTSCacheEntry>();
  private static readonly ttsInFlight = new Map<string, Promise<Blob>>();

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

  private handlePaidApiError(err: Error | XTranslateProTranslateError) {
    const apiError = err as XTranslateProTranslateError;
    let errorMessage: React.ReactNode = apiError.error ?? apiError.message;

    if (apiError.statusCode === 401) {
      errorMessage = getMessage("pro_unauthorized_error_401", {
        serviceUrl: <a href={this.subscribePageUrl} target="_blank">{this.publicUrl}</a>,
      })
    }

    if (apiError.statusCode === 429) {
      const { isFreeUser, isPaidUser, subscription } = userStore;
      if (isFreeUser) {
        errorMessage = getMessage("pro_quota_exceeded_free_trial_error_429", {
          subscribeLink: v => <a href={this.subscribePageUrl} target="_blank">{v}</a>,
        });
      }
      if (isPaidUser) {
        errorMessage = getMessage("pro_quota_exceeded_paid_subscription_error_429", {
          planType: subscription.planType,
          refreshDate: new Date(subscription.periodEnd).toLocaleDateString(),
          contactSupport: v => <a href={`mailto:${supportEmail}`}>{v}</a>,
        });
      }
    }

    apiError.message = errorMessage;
    throw apiError;
  }

  private handleFreeApiError(err: Error | XTranslateProTranslateError) {
    const apiError = err as XTranslateProTranslateError;

    if (apiError.error === XTranslatePro.ERROR_CODE_LIMIT_REACHED) {
      if (apiError.type === "daily") {
        apiError.message = getMessage("pro_self_improve_with_ai_free_exausted_today", {
          loginLink: v => <a href={this.loginUrl} target="_blank">{v}</a>,
        });
      }
      if (apiError.type === "total") {
        apiError.message = getMessage("pro_self_improve_with_ai_free_exausted_total");
      }
    }

    throw apiError;
  }

  async translateMany(params: TranslateParams): Promise<string[]> {
    try {
      const { translation } = await this.translateReq(params);
      return translation;
    } catch (err) {
      this.handlePaidApiError(err);
    }
  }

  async translate(params: TranslateParams): Promise<ITranslationResult> {
    try {
      const output = await this.translateReq(params);
      return this.toTranslationResult(output, params);
    } catch (err) {
      this.handlePaidApiError(err);
    }
  }

  public toTranslationResult(output: XTranslateProTranslateOutput, params: TranslateParams): ITranslationResult {
    const { translation, transcription, detectedLang, spellCorrection, dictionary } = output;
    return {
      vendor: ProviderCodeName.XTRANSLATE_PRO,
      langFrom: params.from,
      langTo: params.to,
      langDetected: detectedLang,
      translation: translation.join("\n"),
      transcription: transcription,
      spellCorrection,
      dictionary,
    }
  }

  @action
  async translateTrial(params: TranslateParams): Promise<ITranslationResult> {
    const trialStore = freeTrialStorage.get();

    const freeResultPromise = this.request<XTranslateProDemoTrialOutput>({
      url: `${this.apiUrl}/translate/demo`,
      requestInit: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anon_id: trialStore.anonId,
          langFrom: params.from,
          langTo: params.to,
          text: params.texts ?? [params.text],
        }),
      }
    });

    try {
      const { limits, result } = await freeResultPromise;
      const { remaining_today, remaining_total } = limits;

      trialStore.todayRemain = remaining_today;
      trialStore.totalRemain = remaining_total;
      trialStore.finished = remaining_total === 0;

      if (!remaining_today) void sendMetric("promo_free_ai_translation_limit_daily", {});
      if (!remaining_total) void sendMetric("promo_free_ai_translation_limit_total", {});

      return this.toTranslationResult(result, params);
    } catch (err) {
      this.handleFreeApiError(err);
    } finally {
      void sendMetric("promo_free_ai_translation_used", {});
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
      this.handlePaidApiError(err);
    }
  }

  override async speak(text: string, lang?: string, voice?: OpenAIModelTTSVoice): Promise<HTMLAudioElement | SpeechSynthesisUtterance | void> {
    voice ??= userStore.data.ttsVoice; // use default value from app's UI settings

    return super.speak(text, lang, voice);
  }

  override stopSpeaking() {
    super.stopSpeaking();
    this.ttsPort?.disconnect();
  }

  private buildCacheKey(text: string, lang?: string, voice?: OpenAIModelTTSVoice): string {
    return JSON.stringify({
      text,
      lang: lang ?? "",
      voice: voice ?? "",
    });
  }

  private buildStorageCacheKey(cacheKey: string): string {
    return `${XTranslatePro.ttsCacheStoragePrefix}:${cacheKey}`;
  }

  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(blob);
      fileReader.onloadend = () => {
        if (typeof fileReader.result === "string") {
          resolve(fileReader.result);
        } else {
          reject(new Error("Unable to convert blob to data-url"));
        }
      };
      fileReader.onerror = () => reject(fileReader.error ?? new Error("Unable to convert blob to data-url"));
    });
  }

  private dataUrlToBlob(dataUrl: string, fallbackType = "audio/mpeg"): Blob {
    const delimiterIndex = dataUrl.indexOf(",");
    if (delimiterIndex < 0) {
      throw new Error("Invalid data-url format");
    }

    const metadata = dataUrl.slice(0, delimiterIndex);
    const body = dataUrl.slice(delimiterIndex + 1);
    const mimeType = metadata.match(/^data:([^;,]+)/i)?.[1] ?? fallbackType;
    const isBase64 = metadata.includes(";base64");
    const decoded = isBase64 ? atob(body) : decodeURIComponent(body);
    const bytes = new Uint8Array(decoded.length);

    for (let index = 0; index < decoded.length; index++) {
      bytes[index] = decoded.charCodeAt(index);
    }

    return new Blob([bytes], {
      type: mimeType,
    });
  }

  private async getCachedBlob(cacheKey: string): Promise<Blob | undefined> {
    const now = Date.now();
    const cachedMemoryEntry = XTranslatePro.ttsMemoryCache.get(cacheKey);
    if (cachedMemoryEntry) {
      if (cachedMemoryEntry.expiresAt > now) {
        return cachedMemoryEntry.blob;
      }
      XTranslatePro.ttsMemoryCache.delete(cacheKey);
    }

    const storageApi = globalThis.chrome?.storage?.local;
    if (!storageApi) {
      return undefined;
    }

    const storageKey = this.buildStorageCacheKey(cacheKey);
    try {
      const storageEntries = await storageApi.get(storageKey);
      const storageEntry = storageEntries?.[storageKey] as XTranslateProPersistentTTSCacheEntry | undefined;

      if (!storageEntry) {
        return undefined;
      }

      if (storageEntry.expiresAt <= now) {
        void storageApi.remove(storageKey).catch(() => {
          return;
        });
        return undefined;
      }

      const blob = this.dataUrlToBlob(storageEntry.data, storageEntry.type);
      XTranslatePro.ttsMemoryCache.set(cacheKey, {
        blob,
        type: storageEntry.type,
        expiresAt: storageEntry.expiresAt,
        updatedAt: storageEntry.updatedAt,
      });

      return blob;
    } catch (error) {
      this.logger.info("[TTS-CACHE]: failed to read persistent cache", error);
      void storageApi.remove(storageKey).catch(() => {
        return;
      });
      return undefined;
    }
  }

  private async setCachedBlob(cacheKey: string, blob: Blob): Promise<void> {
    const now = Date.now();
    const type = blob.type || "audio/mpeg";
    const expiresAt = now + XTranslatePro.ttsCacheTtlMs;
    const memoryEntry: XTranslateProMemoryTTSCacheEntry = {
      blob,
      type,
      expiresAt,
      updatedAt: now,
    };
    XTranslatePro.ttsMemoryCache.set(cacheKey, memoryEntry);

    const storageApi = globalThis.chrome?.storage?.local;
    if (!storageApi) {
      return;
    }

    try {
      const data = await this.blobToDataUrl(blob);
      const storageKey = this.buildStorageCacheKey(cacheKey);
      const persistentEntry: XTranslateProPersistentTTSCacheEntry = {
        data,
        type,
        expiresAt,
        updatedAt: now,
      };
      await storageApi.set({
        [storageKey]: persistentEntry,
      });
    } catch (error) {
      this.logger.info("[TTS-CACHE]: failed to write persistent cache", error);
    }
  }

  private async getInFlightOrFetchBlob(cacheKey: string, fetchBlob: () => Promise<Blob>): Promise<Blob> {
    const existingRequest = XTranslatePro.ttsInFlight.get(cacheKey);
    if (existingRequest) {
      return existingRequest;
    }

    const pendingRequest = fetchBlob();
    XTranslatePro.ttsInFlight.set(cacheKey, pendingRequest);

    try {
      return await pendingRequest;
    } finally {
      if (XTranslatePro.ttsInFlight.get(cacheKey) === pendingRequest) {
        XTranslatePro.ttsInFlight.delete(cacheKey);
      }
    }
  }

  private async streamBlobAudio(blob: Blob): Promise<boolean> {
    const contentType = blob.type || "audio/mpeg";
    if (!window.MediaSource || !MediaSource.isTypeSupported(contentType)) {
      return false;
    }

    const mediaSource = new MediaSource();
    this.audio = document.createElement("audio");
    this.audio.src = this.audioDataUrl = URL.createObjectURL(mediaSource);

    return new Promise((resolve) => {
      const queue: Uint8Array[] = [];
      let sourceBuffer: SourceBuffer | undefined;
      let streamFinished = false;
      let streamStarted = false;
      let isResolved = false;

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
            this.logger.error("[TTS-STREAM-CACHE]: SourceBuffer append failed", error);
            resolveOnce(false);
          }
          return;
        }

        if (streamFinished) {
          endOfStream();
          if (!streamStarted) {
            resolveOnce(false);
          }
        }
      };

      mediaSource.addEventListener("sourceopen", () => {
        try {
          sourceBuffer = mediaSource.addSourceBuffer(contentType);
        } catch (error) {
          this.logger.error("[TTS-STREAM-CACHE]: SourceBuffer init failed", error);
          resolveOnce(false);
          return;
        }

        sourceBuffer.addEventListener("updateend", processQueue);

        const reader = blob.stream().getReader();
        const readNext = (): void => {
          void reader.read().then(({ done, value }) => {
            if (done) {
              streamFinished = true;
              processQueue();
              return;
            }

            if (value?.length) {
              queue.push(value);
              streamStarted = true;
              processQueue();

              if (!isResolved) {
                resolveOnce(true);
                void this.audio.play().catch((error: unknown): void => {
                  this.logger.info("[TTS-STREAM-CACHE]: autoplay was blocked", error);
                });
              }
            }

            readNext();
          }).catch((error: unknown) => {
            this.logger.error("[TTS-STREAM-CACHE]: blob stream failed", error);
            resolveOnce(false);
          });
        };

        readNext();
      }, { once: true });
    });
  }

  async getAudioFile(text: string, lang?: string, voice?: OpenAIModelTTSVoice): Promise<Blob> {
    this.logger.info("attempt for text-to-speech with params", { text, lang, voice });
    const cacheKey = this.buildCacheKey(text, lang, voice);
    const cachedBlob = await this.getCachedBlob(cacheKey);
    if (cachedBlob) {
      return cachedBlob;
    }

    return this.getInFlightOrFetchBlob(cacheKey, async () => {
      const audioBlob = await this.request<Blob>({
        url: `${this.apiUrl}/tts`,
        requestInit: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, lang, voice }),
          credentials: "include",
        },
        responseType: ProxyResponseType.BLOB,
      });

      void this.setCachedBlob(cacheKey, audioBlob);
      return audioBlob;
    });
  }

  override async streamAudio(text: string, lang?: string, voice?: OpenAIModelTTSVoice): Promise<boolean> {
    if (!window.MediaSource || !MediaSource.isTypeSupported("audio/mpeg")) {
      return false;
    }

    const cacheKey = this.buildCacheKey(text, lang, voice);
    const cachedBlob = await this.getCachedBlob(cacheKey);
    if (cachedBlob) {
      return this.streamBlobAudio(cachedBlob);
    }

    const inFlightRequest = XTranslatePro.ttsInFlight.get(cacheKey);
    if (inFlightRequest) {
      try {
        const inFlightBlob = await inFlightRequest;
        return this.streamBlobAudio(inFlightBlob);
      } catch {
        return false;
      }
    }

    let resolveBlob: (blob: Blob) => void = () => undefined;
    let rejectBlob: (error?: unknown) => void = () => undefined;
    let isInFlightSettled = false;
    const inFlightBlobRequest = new Promise<Blob>((resolve, reject) => {
      resolveBlob = resolve;
      rejectBlob = reject;
    });
    XTranslatePro.ttsInFlight.set(cacheKey, inFlightBlobRequest);
    inFlightBlobRequest.then(
      () => {
        if (XTranslatePro.ttsInFlight.get(cacheKey) === inFlightBlobRequest) {
          XTranslatePro.ttsInFlight.delete(cacheKey);
        }
      },
      () => {
        if (XTranslatePro.ttsInFlight.get(cacheKey) === inFlightBlobRequest) {
          XTranslatePro.ttsInFlight.delete(cacheKey);
        }
      },
    );

    const mediaSource = new MediaSource();
    this.audio = document.createElement("audio");
    this.audio.src = this.audioDataUrl = URL.createObjectURL(mediaSource);

    return new Promise((resolve) => {
      this.ttsPort = chrome.runtime.connect({
        name: MessageType.HTTP_PROXY_STREAM,
      });

      const queue: Uint8Array[] = [];
      const chunkBuffer: ArrayBuffer[] = [];
      let sourceBuffer: SourceBuffer | undefined;
      let portFinished = false;
      let streamStarted = false;
      let isResolved = false;
      let audioStarted = false;
      let contentType = "audio/mpeg";

      const resolveOnce = (result: boolean) => {
        if (isResolved) return;
        isResolved = true;
        resolve(result);
      };

      const resolveInFlight = (blob: Blob) => {
        if (isInFlightSettled) return;
        isInFlightSettled = true;
        resolveBlob(blob);
      };

      const rejectInFlight = (error?: unknown) => {
        if (isInFlightSettled) return;
        isInFlightSettled = true;
        rejectBlob(error);
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
        if (!portFinished) {
          rejectInFlight(new Error("TTS stream has been disconnected"));
        }
        if (!streamStarted) {
          resolveOnce(false);
        }
      });

      this.ttsPort.onMessage.addListener((msg: ProxyStreamResponsePayload) => {
        if ("headers" in msg && msg.headers?.["content-type"]) {
          contentType = msg.headers["content-type"];
          return;
        }

        if ("error" in msg && msg.error) {
          this.logger.error("[TTS-STREAM]", {
            error: msg.error,
            statusCode: msg.statusCode,
            statusText: msg.statusText,
          });
          portFinished = true;
          rejectInFlight(new Error(msg.error));
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
          rejectInFlight(new Error(msg.statusText || `HTTP ${msg.statusCode}`));
          endOfStream();
          resolveOnce(false);
          this.ttsPort?.disconnect();
          return;
        }

        if ("chunk" in msg && msg.chunk?.length) {
          const chunk = new Uint8Array(msg.chunk);
          const chunkData = new Uint8Array(chunk.byteLength);
          chunkData.set(chunk);

          queue.push(chunkData);
          chunkBuffer.push(chunkData.buffer as ArrayBuffer);
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
          if (streamStarted) {
            const audioBlob = new Blob(chunkBuffer, { type: contentType });
            resolveInFlight(audioBlob);
            void this.setCachedBlob(cacheKey, audioBlob);
          } else {
            rejectInFlight(new Error("TTS stream returned no audio chunks"));
            resolveOnce(false);
          }
          this.ttsPort?.disconnect();
        }
      });

      // init api streaming request and start playing tts-audio asap
      try {
        this.ttsPort.postMessage({
          url: `${this.apiUrl}/tts`,
          requestInit: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, lang, voice }),
            credentials: "include",
          }
        });
      } catch (error) {
        rejectInFlight(error);
        resolveOnce(false);
        this.ttsPort?.disconnect();
      }
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

  async loadSubscription(): Promise<XTranslateProSubscriptionResponse> {
    return this.request({
      url: `${this.apiUrl}/user/plan`,
      requestInit: { credentials: "include" },
    });
  }
}

interface XTranslateProPersistentTTSCacheEntry {
  data: string;
  type: string;
  expiresAt: number;
  updatedAt: number;
}

interface XTranslateProMemoryTTSCacheEntry extends Omit<XTranslateProPersistentTTSCacheEntry, "data"> {
  blob: Blob;
}

export interface XTranslateProTranslateInput {
  langFrom?: string;
  langTo: string;
  text: string[];
}

export interface XTranslateProDemoTrialOutput {
  result: XTranslateProTranslateOutput;
  limits: {
    remaining_today: number;
    remaining_total: number;
  };
}

export type XTranslateProDemoTrialLimitType = "daily" | "total";

export interface XTranslateProTranslateOutput {
  detectedLang: string;
  translation: string[];
  transcription?: string;
  spellCorrection?: string;
  dictionary?: ITranslationDictionary[];
  tokensTotalUsed: number;
}

export interface XTranslateProTranslateError extends ITranslationError {
  error: string;
  type?: XTranslateProDemoTrialLimitType;
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

export type XTranslateProPlanType = "FREE_TRIAL" | "MONTHLY" | "YEARLY";
export type XTranslateProStatus = "PAID" | "FAILED" | "REFUNDED" | "CANCELED";

export interface XTranslateProSubscriptionResponse extends XTranslateProSubscription {
  user?: XTranslateProUser;
}

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
