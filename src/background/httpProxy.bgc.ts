//-- Network proxy (to avoid CORS errors in `options` and `content-script` pages)

import type { ITranslationError } from "@/providers";
import { blobToBase64DataUrl, createLogger, toBinaryFile } from "../utils";
import { isBackgroundWorker, onMessage, sendMessage } from "../extension/runtime"
import { MessageType, ProxyRequestPayload, ProxyResponsePayload, ProxyResponseType } from "../extension/messages"

const logger = createLogger({ systemPrefix: '[HTTP-PROXY]' });

export function listenProxyRequestActions() {
  return onMessage(MessageType.PROXY_REQUEST, handleProxyRequestPayload);
}

export function listenProxyConnection() {
  chrome.runtime.onConnect.addListener(onProxyConnection);
}

function onProxyConnection(port: chrome.runtime.Port) {
  if (port.name !== "http_proxy_stream") return;

  port.onMessage.addListener(async (msg: ProxyRequestPayload) => {
    try {
      const response = await fetch(msg.url, msg.requestInit);

      port.postMessage({
        headers: Object.fromEntries(response.headers),
        statusCode: response.status,
        statusText: response.statusText,
      });

      if (!response.body) {
        port.postMessage({ done: true });
        return;
      }

      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          port.postMessage({ done: true });
          break;
        }
        port.postMessage({ chunk: Array.from(value) });
      }
    } catch (error) {
      port.postMessage({ error: error.message });
    }
  });
}

// TODO: support streaming TTS
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

  if (isBackgroundWorker()) {
    response = await handleProxyRequestPayload(payload);
  } else {
    response = await sendMessage<ProxyRequestPayload, ProxyResponsePayload<Response>>({
      type: MessageType.PROXY_REQUEST,
      payload: {
        responseType: ProxyResponseType.JSON, /*default*/
        ...payload,
      },
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
