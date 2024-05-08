//-- Network proxy (to avoid CORS errors in `options` and `content-script` pages)

import { blobToBase64DataUrl, createLogger, parseJson } from "../utils";
import { MessageType, onMessage, ProxyRequestPayload, ProxyResponsePayload, ProxyResponseType } from '../extension'

const logger = createLogger({ systemPrefix: '[BACKGROUND(proxy)]' });

export function listenProxyRequestActions() {
  return onMessage(MessageType.PROXY_REQUEST, handleHttpRequestFromAction);
}

export async function handleHttpRequestFromAction({ url, responseType, requestInit }: ProxyRequestPayload) {
  logger.info(`proxying request (${responseType}): ${url}`);

  const httpResponse = await fetch(url, requestInit);
  const payload: ProxyResponsePayload<any> = {
    url,
    headers: Object.fromEntries(httpResponse.headers),
    data: undefined,
  };

  switch (responseType) {
  case ProxyResponseType.JSON:
    payload.data = await parseJson(httpResponse);
    break;

  case ProxyResponseType.TEXT:
    payload.data = await httpResponse.text();
    break;

  case ProxyResponseType.DATA_URL:
    const blob = await httpResponse.blob();
    payload.data = await blobToBase64DataUrl(blob);
    break;

  case ProxyResponseType.BLOB:
    const buffer = await httpResponse.arrayBuffer();
    const transferableDataContainer = new Uint8Array(buffer);
    payload.data = Array.from(transferableDataContainer);
    break;
  }

  return payload;
}

