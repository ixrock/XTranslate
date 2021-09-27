//-- Background service worker

import "../packages.setup";
import "./contextMenu"
import { isPlainObject } from "lodash"
import { isProduction } from "../common-vars";
import { blobToBase64, createLogger, parseJson } from "../utils";
import { Message, MessageType, onInstall, onMessageType, openOptionsPage, ProxyRequestPayload, ProxyRequestResponse, ProxyResponseType, SaveToHistoryPayload } from '../extension'
import { rateLastTimestamp } from "../components/app/app-rate.storage";
import { importHistory, loadHistory, toStorageItem } from "../components/user-history/history.storage";

// FIXME: material-icons fuckup page issue (#25)
// FIXME: bing borken again
// TODO: deepl: allow to enter own auth-key
// TODO: allow to use custom fonts (#32)
// TODO: add multi language/vendor selector

const logger = createLogger({ systemPrefix: "[BACKGROUND]" });

onInstall((reason) => {
  if (reason === "install" || !isProduction) {
    rateLastTimestamp.set(Date.now());
    openOptionsPage();
  }
});

/**
 * Network proxy for `options` and `content-script` pages (to avoid CORS, etc.)
 */
onMessageType<ProxyRequestPayload, ProxyRequestResponse>(MessageType.PROXY_REQUEST, async (message, sender, sendResponse) => {
  const { url, responseType, requestInit } = message.payload;
  const proxyResult: ProxyRequestResponse = {
    messageId: message.id,
    url: url,
    data: undefined,
    error: undefined,
  };

  try {
    logger.info(`proxy request`, message.payload);
    const httpResponse = await fetch(url, requestInit);
    switch (responseType) {
      case ProxyResponseType.JSON:
        proxyResult.data = await parseJson(httpResponse);
        break;

      case ProxyResponseType.TEXT:
        proxyResult.data = await httpResponse.text();
        break;

      case ProxyResponseType.DATA_URI:
        const binaryData = await httpResponse.blob();
        proxyResult.data = await blobToBase64(binaryData);
        break;
    }
  } catch (error) {
    logger.error(`proxy error: ${error?.message}`, { error, message });
    proxyResult.error = isPlainObject(error) ? error : { message: String(error) };
  }

  // response api delay simulation
  // const delayMs = Math.round(Math.random() * 2500) + 2000 /*min-delay: 2s*/;
  // console.log(`DELAY: ${delayMs} before response for result`, proxyResult);
  // await delay(delayMs);
  sendResponse(proxyResult);
});

/**
 * Saving translation result to history
 */
onMessageType(MessageType.SAVE_TO_HISTORY, async (message: Message<SaveToHistoryPayload>) => {
  try {
    const { translation } = message.payload;
    const storageItem = toStorageItem(translation);
    await loadHistory();
    importHistory(storageItem);
  } catch (error) {
    logger.error(`saving item to history has failed: ${error}`, message);
  }
});

