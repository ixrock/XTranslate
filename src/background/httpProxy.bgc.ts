//-- Network proxy (to avoid CORS errors in `options` and `content-script` pages)

import { blobToBase64DataUrl, createLogger, parseJson, toBinaryFile } from "../utils";
import { isBackgroundWorker, onMessage, sendMessage } from "../extension/runtime"
import { MessageType, ProxyRequestPayload, ProxyResponsePayload, ProxyResponseType } from "../extension/messages"

const logger = createLogger({ systemPrefix: '[BACKGROUND(proxy)]' });

export function listenProxyRequestActions() {
  return onMessage(MessageType.PROXY_REQUEST, handleProxyRequestPayload);
}

export async function handleProxyRequestPayload<Response>({ url, responseType, requestInit }: ProxyRequestPayload) {
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

  return payload as Response;
}

export async function proxyRequest<Response>(payload: ProxyRequestPayload): Promise<Response> {
  let response: ProxyResponsePayload<Response>;

  if (isBackgroundWorker()) {
    response = await handleProxyRequestPayload(payload);
  } else {
    response = await sendMessage<ProxyRequestPayload>({
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
