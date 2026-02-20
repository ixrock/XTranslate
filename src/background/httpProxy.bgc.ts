//-- Network proxy (to avoid CORS errors in `options` and `content-script` pages)

import type { ITranslationError } from "@/providers";
import { blobToBase64DataUrl, createLogger, toBinaryFile } from "../utils";
import { isBackgroundWorker, onMessage, sendMessage } from "../extension/runtime"
import { MessageType, ProxyRequestPayload, ProxyResponsePayload, ProxyResponseType, ProxyStreamPayload, ProxyStreamResponsePayload } from "../extension/messages"

const logger = createLogger({ systemPrefix: '[HTTP-PROXY]' });

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown proxy error";
  }
}

function toHeadersObject(headers: Headers): ProxyResponsePayload["headers"] {
  return Object.fromEntries(headers);
}

function postStreamMessage(port: chrome.runtime.Port, message: ProxyStreamResponsePayload) {
  try {
    port.postMessage(message);
    return true;
  } catch {
    return false;
  }
}

export function listenProxyRequestActions() {
  return onMessage(MessageType.PROXY_REQUEST, handleProxyRequestPayload);
}

export function listenProxyConnection() {
  chrome.runtime.onConnect.addListener(onProxyConnection);
}

function onProxyConnection(port: chrome.runtime.Port) {
  if (port.name !== MessageType.HTTP_PROXY_STREAM) return;

  port.onMessage.addListener(async (msg: ProxyStreamPayload) => {
    const abortController = new AbortController();
    const onDisconnect = () => abortController.abort();
    port.onDisconnect.addListener(onDisconnect);

    try {
      const response = await fetch(msg.url, {
        ...msg.requestInit,
        signal: abortController.signal,
      });
      const headers = toHeadersObject(response.headers);

      if (!response.ok) {
        const responseText = await response.text().catch(() => "");
        postStreamMessage(port, {
          error: responseText || response.statusText || `HTTP ${response.status}`,
          statusCode: response.status,
          statusText: response.statusText,
        });
        postStreamMessage(port, { done: true });
        return;
      }

      if (!postStreamMessage(port, {
        headers,
        statusCode: response.status,
        statusText: response.statusText,
      })) {
        return;
      }

      if (!response.body) {
        postStreamMessage(port, { done: true });
        return;
      }

      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          postStreamMessage(port, { done: true });
          break;
        }
        if (!postStreamMessage(port, { chunk: Array.from(value) })) {
          abortController.abort();
          break;
        }
      }
    } catch (error: unknown) {
      if (abortController.signal.aborted) return;
      postStreamMessage(port, {
        error: getErrorMessage(error),
      });
      postStreamMessage(port, { done: true });
    } finally {
      port.onDisconnect.removeListener(onDisconnect);
    }
  });
}

export async function handleProxyRequestPayload<Response>({ url, responseType, requestInit }: ProxyRequestPayload) {
  logger.info(`proxying request (${responseType}): ${url}`);

  const response = await fetch(url, requestInit);
  const payload: ProxyResponsePayload = {
    url,
    headers: Object.fromEntries(response.headers),
    data: undefined,
  };

  switch (responseType) {
  case ProxyResponseType.JSON: {
    const data = await response.json();
    if (response.ok) payload.data = data;
    else {
      throw {
        statusCode: response.status,
        message: response.statusText,
        ...data,
      } as ITranslationError;
    }
    break;
  }

  case ProxyResponseType.TEXT:
    payload.data = await response.text();
    break;

  case ProxyResponseType.DATA_URL:
    const blob = await response.blob();
    payload.data = await blobToBase64DataUrl(blob);
    break;

  case ProxyResponseType.BLOB:
    const buffer = await response.arrayBuffer();
    const transferableDataContainer = new Uint8Array(buffer);
    payload.data = Array.from(transferableDataContainer);
    break;
  }

  return payload as Response;
}

export async function proxyRequest<Response>(payload: ProxyRequestPayload): Promise<Response> {
  let response: ProxyResponsePayload<Response>;

  payload.responseType ??= ProxyResponseType.JSON;

  if (isBackgroundWorker()) {
    response = await handleProxyRequestPayload(payload);
  } else {
    response = await sendMessage<ProxyRequestPayload, ProxyResponsePayload<Response>>({
      type: MessageType.PROXY_REQUEST,
      payload,
    });
  }

  if (payload.responseType === ProxyResponseType.BLOB) {
    return toBinaryFile(
      response.data as Uint8Array,
      response.headers["content-type"]
    ) as Response;
  }

  return response.data;
}
