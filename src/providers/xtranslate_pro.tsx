import React from "react";
import { action } from "mobx";
import LanguagesList from "./bing.json"
import { getTranslator, ITranslationDictionary, ITranslationError, ITranslationResult, ProviderCodeName, TranslateBatchResult, TranslateClientContext, TranslateMode, TranslateParams, Translator, XTranslateProTTSVoice } from "./index";
import { MessageType, openProxyStream, ProxyResponseType, ProxyStreamResponsePayload } from "@/extension";
import { supportEmail, websiteURL } from "@/config";
import { sendMetric } from "@/background/metrics.bgc";
import { createStorage } from "@/storage";
import { getMessage } from "@/i18n";
import { userStorage, userStore } from "@/pro";
import { base64Decode, blobToBase64DataUrl, SSEMessage, SSEParser } from "@/utils";

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

function serializeTtsRequest(text: string, voice: string): string {
  return JSON.stringify({ text: text.trim(), voice });
}

export class XTranslatePro extends Translator {
  static ERROR_CODE_LIMIT_REACHED = "LIMIT_REACHED";
  static ERROR_CODE_INPUT_TOO_LARGE_ERROR = "INPUT_TOO_LARGE";

  override name = ProviderCodeName.XTRANSLATE_PRO;
  override title = "XTranslate PRO";

  override publicUrl = websiteURL;
  override apiUrl = `${websiteURL}/api`;
  public subscribePageUrl = `${websiteURL}/subscribe`;
  public loginUrl = `${websiteURL}/api/auth/signin?callbackUrl=/billing`;

  private disconnectTtsStream?: () => void;
  private static readonly ttsCacheTtlMs = 24 * 60 * 60 * 1000; // 24h
  private static readonly ttsCacheStoragePrefix = "xtranslate_pro_tts_cache";
  private static readonly ttsMemoryCache = new Map<string, XTranslateProMemoryTTSCacheEntry>();
  private static readonly ttsInFlight = new Map<string, Promise<Blob>>();
  private legacyTtsKeys?: Promise<Map<string, string[]>>;

  constructor() {
    super({
      languages: LanguagesList,
    });
  }

  private async translateReq(params: TranslateParams): Promise<XTranslateProTranslateOutput> {
    const { from, to: langTo, text, texts = [text], mode, client } = params;
    const langFrom = from === "auto" ? undefined : from;

    const payload: XTranslateProTranslateInput = {
      langFrom,
      langTo,
      text: texts,
      mode,
      client,
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

  async streamPageTranslation(
    params: XTranslateProTranslateStreamInput,
    handlers: XTranslateProTranslateStreamHandlers = {},
  ): Promise<void> {
    const decoder = new TextDecoder();
    const parser = new SSEParser();
    const langFrom = params.langFrom === "auto" ? undefined : params.langFrom;
    let connection: ReturnType<typeof openProxyStream> | undefined;
    let isSettled = false;
    let isCompleted = false;
    let onAbort: (() => void) | undefined;

    const finalize = (callback: () => void) => {
      if (isSettled) return;
      isSettled = true;
      callback();
    };

    const disconnect = () => {
      connection?.disconnect();
      connection = undefined;
    };

    const handleEventMessage = (message: SSEMessage) => {
      const payload = JSON.parse(message.data);

      switch (message.event) {
      case "job_started":
        handlers.onStarted?.(payload as XTranslateProTranslateStreamJobStartedEvent);
        return;

      case "batch_done":
        handlers.onBatchDone?.(payload as XTranslateProTranslateStreamBatchDoneEvent);
        return;

      case "job_stats":
        handlers.onStats?.(payload as XTranslateProTranslateStreamJobStatsEvent);
        return;

      case "job_completed":
        isCompleted = true;
        handlers.onCompleted?.(payload as XTranslateProTranslateStreamJobCompletedEvent);
        return;

      case "error": {
        const streamError = payload as XTranslateProTranslateStreamErrorEvent;
        handlers.onError?.(streamError);
        throw {
          statusCode: 500,
          message: streamError.message,
          error: streamError.code,
        } satisfies XTranslateProTranslateError;
      }
      }
    };

    const parseChunk = (chunk: string) => {
      parser.feed(chunk).forEach(handleEventMessage);
    };

    const flushParser = () => {
      const trailingChunk = decoder.decode();
      if (trailingChunk) {
        parseChunk(trailingChunk);
      }
      parser.flush().forEach(handleEventMessage);
    };

    return new Promise<void>((resolve, reject) => {
      onAbort = () => {
        finalize(() => {
          disconnect();
          reject(new Error("Page translation stream aborted"));
        });
      };

      if (handlers.signal?.aborted) {
        onAbort();
        return;
      }

      handlers.signal?.addEventListener("abort", onAbort, { once: true });

      connection = openProxyStream({
        url: `${this.apiUrl}/translate/stream`,
        requestInit: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
          },
          credentials: "include",
          body: JSON.stringify({
            ...params,
            langFrom,
          }),
        },
      }, {
        onHeaders: ({ headers }) => {
          const contentType = headers["content-type"] ?? "";
          if (contentType && !contentType.includes("text/event-stream")) {
            finalize(() => {
              disconnect();
              reject(new Error(`Unexpected stream content-type: ${contentType}`));
            });
          }
        },
        onChunk: (chunk) => {
          if (isSettled) return;

          try {
            parseChunk(decoder.decode(chunk, { stream: true }));
          } catch (error) {
            finalize(() => {
              disconnect();
              reject(error);
            });
          }
        },
        onError: ({ error, statusCode, statusText }) => {
          if (isSettled) return;

          finalize(() => {
            disconnect();
            handlers.onError?.({
              code: "STREAM_REQUEST_FAILED",
              message: error,
              retryable: statusCode ? statusCode >= 500 : true,
            });
            reject({
              statusCode,
              message: error || statusText || "Stream request failed",
            } satisfies ITranslationError);
          });
        },
        onDone: () => {
          if (isSettled) return;

          try {
            flushParser();
            finalize(() => {
              disconnect();
              resolve();
            });
          } catch (error) {
            finalize(() => {
              disconnect();
              reject(error);
            });
          }
        },
        onDisconnect: (initiatedByClient) => {
          if (isSettled || initiatedByClient) return;

          finalize(() => {
            handlers.onError?.({
              code: "STREAM_DISCONNECTED",
              message: isCompleted
                ? "Page translation stream disconnected after completion"
                : "Page translation stream disconnected unexpectedly",
              retryable: !isCompleted,
            });

            if (isCompleted) {
              resolve();
            } else {
              reject(new Error("Page translation stream disconnected unexpectedly"));
            }
          });
        },
      });
    }).finally(() => {
      if (onAbort) {
        handlers.signal?.removeEventListener("abort", onAbort);
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
        freeTrialStorage.merge({
          totalRemain: 0,
          finished: true,
        });
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

  async translateBatch(params: TranslateParams): Promise<TranslateBatchResult> {
    try {
      const { translation, detectedLang } = await this.translateReq(params);
      return {
        translation: this.normalizeMany(params, translation),
        detectedLang,
      };
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

  override stopSpeaking() {
    super.stopSpeaking();
    this.disconnectTtsStream?.();
  }

  private async getTtsRequestBody(text: string, voice?: XTranslateProTTSVoice): Promise<string> {
    if (!voice) {
      await userStorage.load();
      voice = userStore.data.ttsVoice ?? XTranslateProTTSVoice.Alloy;
    }
    return serializeTtsRequest(text, voice);
  }

  private buildStorageCacheKey(cacheKey: string): string {
    return `${XTranslatePro.ttsCacheStoragePrefix}:${cacheKey}`;
  }

  private async indexLegacyTtsKeys(storage: chrome.storage.StorageArea): Promise<Map<string, string[]>> {
    const keys = storage.getKeys ? await storage.getKeys() : Object.keys(await storage.get(null));
    const prefix = this.buildStorageCacheKey("");
    const index = new Map<string, string[]>();
    for (const key of keys) {
      if (!key.startsWith(prefix)) continue;
      try {
        const { text, lang, voice } = JSON.parse(key.slice(prefix.length));
        if (typeof lang !== "string" || typeof text !== "string" || typeof voice !== "string") continue;
        // Older downloads omitted the voice, so the server synthesized them with Alloy.
        const body = serializeTtsRequest(text, voice || XTranslateProTTSVoice.Alloy);
        const matches = index.get(body);
        if (matches) matches.push(key);
        else index.set(body, [key]);
      } catch {
        // A malformed storage key cannot identify a recording.
      }
    }
    return index;
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
    const bytes = isBase64 ? base64Decode(body, true) : Uint8Array.from(decodeURIComponent(body), char => char.charCodeAt(0));

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

    try {
      this.legacyTtsKeys ??= this.indexLegacyTtsKeys(storageApi).catch(error => {
        this.legacyTtsKeys = undefined;
        this.logger.info("[TTS-CACHE]: failed to list legacy entries", error);
        return new Map<string, string[]>();
      });
      const legacyKeys = (await this.legacyTtsKeys).get(cacheKey) ?? [];
      const keys = [this.buildStorageCacheKey(cacheKey), ...legacyKeys];
      const entries = await storageApi.get(keys);
      for (const key of keys) {
        const entry = entries[key] as XTranslateProPersistentTTSCacheEntry | undefined;
        if (!entry) continue;
        if (entry.expiresAt > Date.now()) {
          try {
            const blob = this.dataUrlToBlob(entry.data, entry.type);
            if (blob.size && blob.type.startsWith("audio/")) {
              XTranslatePro.ttsMemoryCache.set(cacheKey, {
                blob, type: blob.type, expiresAt: entry.expiresAt, updatedAt: entry.updatedAt,
              });
              return blob;
            }
          } catch (error) {
            this.logger.info("[TTS-CACHE]: failed to decode audio", error);
          }
        }
        void storageApi.remove(key).catch(error => this.logger.info("[TTS-CACHE]: failed to remove entry", error));
      }
    } catch (error) {
      this.logger.info("[TTS-CACHE]: failed to read persistent cache", error);
    }
    // Another consumer may have finished while storage was returning an earlier snapshot.
    return XTranslatePro.ttsMemoryCache.get(cacheKey)?.blob;
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
      const data = await blobToBase64DataUrl(blob);
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

  async getAudioFile(text: string, lang?: string, voice?: XTranslateProTTSVoice): Promise<Blob> {
    this.logger.info("attempt for text-to-speech with params", { text, lang, voice });
    const requestBody = await this.getTtsRequestBody(text, voice);
    const cachedBlob = await this.getCachedBlob(requestBody);
    if (cachedBlob) {
      return cachedBlob;
    }

    return this.getInFlightOrFetchBlob(requestBody, async () => {
      const audioBlob = await this.request<Blob>({
        url: `${this.apiUrl}/tts`,
        requestInit: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
          credentials: "include",
        },
        responseType: ProxyResponseType.BLOB,
      });

      if (!audioBlob.size || !audioBlob.type.startsWith("audio/")) {
        throw new Error("TTS returned no playable audio");
      }
      await this.setCachedBlob(requestBody, audioBlob);
      return audioBlob;
    });
  }

  override async streamAudio(text: string, _lang?: string, voice?: XTranslateProTTSVoice): Promise<boolean> {
    if (!window.MediaSource || !MediaSource.isTypeSupported("audio/mpeg")) {
      return false;
    }

    const requestBody = await this.getTtsRequestBody(text, voice);
    const cachedBlob = await this.getCachedBlob(requestBody);
    if (cachedBlob) {
      return this.streamBlobAudio(cachedBlob);
    }

    const inFlightRequest = XTranslatePro.ttsInFlight.get(requestBody);
    if (inFlightRequest) {
      try {
        const inFlightBlob = await inFlightRequest;
        return this.streamBlobAudio(inFlightBlob);
      } catch {
        return false;
      }
    }

    const mediaSource = new MediaSource();
    this.audio = document.createElement("audio");
    this.audio.src = this.audioDataUrl = URL.createObjectURL(mediaSource);
    const port = chrome.runtime.connect({ name: MessageType.HTTP_PROXY_STREAM });

    let resolveBlob: (blob: Blob) => void;
    let rejectBlob: (error: unknown) => void;
    const inFlightBlobRequest = new Promise<Blob>((resolve, reject) => {
      resolveBlob = resolve;
      rejectBlob = reject;
    });
    XTranslatePro.ttsInFlight.set(requestBody, inFlightBlobRequest);
    const forgetRequest = () => {
      if (XTranslatePro.ttsInFlight.get(requestBody) === inFlightBlobRequest) {
        XTranslatePro.ttsInFlight.delete(requestBody);
      }
    };
    inFlightBlobRequest.then(forgetRequest, forgetRequest);

    return new Promise((resolve) => {
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

      const onDisconnect = () => {
        if (this.disconnectTtsStream === disconnect) this.disconnectTtsStream = undefined;
        if (!portFinished) rejectBlob(new Error("TTS stream has been disconnected"));
        if (!streamStarted) resolveOnce(false);
      };
      const disconnect = () => {
        // Chrome only notifies the other end when we disconnect our own port.
        onDisconnect();
        port.disconnect();
      };
      this.disconnectTtsStream = disconnect;
      port.onDisconnect.addListener(onDisconnect);

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
            disconnect();
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
          disconnect();
          return;
        }

        sourceBuffer.addEventListener("updateend", () => {
          processQueue();
        });
        processQueue();
      }, { once: true });

      port.onMessage.addListener((msg: ProxyStreamResponsePayload) => {
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
          rejectBlob(new Error(msg.error));
          endOfStream();
          resolveOnce(false);
          disconnect();
          return;
        }

        if ("statusCode" in msg && msg.statusCode >= 400) {
          this.logger.error("[TTS-STREAM]", {
            statusCode: msg.statusCode,
            statusText: msg.statusText,
          });
          portFinished = true;
          rejectBlob(new Error(msg.statusText || `HTTP ${msg.statusCode}`));
          endOfStream();
          resolveOnce(false);
          disconnect();
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
            resolveBlob(audioBlob);
            void this.setCachedBlob(requestBody, audioBlob);
          } else {
            rejectBlob(new Error("TTS stream returned no audio chunks"));
            resolveOnce(false);
          }
          disconnect();
        }
      });

      // init api streaming request and start playing tts-audio asap
      try {
        port.postMessage({
          url: `${this.apiUrl}/tts`,
          requestInit: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: requestBody,
            credentials: "include",
          }
        });
      } catch (error) {
        rejectBlob(error);
        resolveOnce(false);
        disconnect();
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
  mode?: TranslateMode;
  client?: TranslateClientContext;
}

export interface XTranslateProTranslateStreamInput {
  langFrom?: string;
  langTo: string;
  mode: "page";
  page: {
    page_id: string;
    request_id: string;
    url: string;
    title?: string;
  };
  segments: XTranslateProTranslateStreamSegment[];
}

export interface XTranslateProTranslateStreamSegment {
  id: string;
  text: string;
  order: number;
  visible: boolean;
}

export interface XTranslateProTranslateStreamHandlers {
  signal?: AbortSignal;
  onStarted?(event: XTranslateProTranslateStreamJobStartedEvent): void;
  onBatchDone?(event: XTranslateProTranslateStreamBatchDoneEvent): void;
  onStats?(event: XTranslateProTranslateStreamJobStatsEvent): void;
  onCompleted?(event: XTranslateProTranslateStreamJobCompletedEvent): void;
  onError?(event: XTranslateProTranslateStreamErrorEvent): void;
}

export interface XTranslateProTranslateStreamJobStartedEvent {
  requestId: string;
  mode: "page";
  totalSegments: number;
}

export interface XTranslateProTranslateStreamBatchDoneEvent {
  batchIndex: number;
  detectedLang?: string;
  items: XTranslateProTranslateStreamBatchItem[];
}

export interface XTranslateProTranslateStreamBatchItem {
  id: string;
  translation: string;
}

export interface XTranslateProTranslateStreamJobStatsEvent {
  cache?: {
    hitCount: number;
    missCount: number;
  };
  batches?: {
    completed: number;
    total: number;
  };
}

export interface XTranslateProTranslateStreamJobCompletedEvent {
  requestId: string;
  translatedSegments: number;
  totalSegments: number;
}

export interface XTranslateProTranslateStreamErrorEvent {
  code: string;
  message: string;
  retryable?: boolean;
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

export type XTranslateProPlanType = "FREE_TRIAL" | "MONTHLY" | "YEARLY" | "MONTHLY_LITE" | "YEARLY_LITE";
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
