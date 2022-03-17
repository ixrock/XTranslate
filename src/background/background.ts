//-- Background service worker

import "../packages.setup";
import "./contextMenu"
import { isProduction } from "../common-vars";
import { blobToBase64, parseJson } from "../utils";
import { ChromeTtsPayload, MessageType, onInstall, onMessage, openOptionsPage, ProxyRequestPayload, ProxyResponseType, SaveToHistoryPayload } from '../extension'
import { rateLastTimestamp } from "../components/app/app-rate.storage";
import { generateId, historyStorage, IHistoryStorageItem, importHistory, loadHistory, toStorageItem, toTranslationResult } from "../components/user-history/history.storage";
import type { TranslatePayload } from "../vendors/translator";

// TODO: provide fallback-translation on error from another available vendor on the-fly/transparent
// TODO: update styles to (s)css-modules + better dark/light theme support
// TODO: input-translation page: keep changes in URL and allow navigation back & forward

onInstall((reason) => {
  if (reason === "install" || !isProduction) {
    rateLastTimestamp.set(Date.now());
    openOptionsPage();
  }
});

/**
 * Network proxy for `options` and `content-script` pages (to avoid CORS, etc.)
 */
onMessage(MessageType.PROXY_REQUEST, async ({ url, responseType, requestInit }: ProxyRequestPayload) => {
  const httpResponse = await fetch(url, requestInit);

  switch (responseType) {
    case ProxyResponseType.JSON:
      return parseJson(httpResponse);

    case ProxyResponseType.TEXT:
      return httpResponse.text();

    case ProxyResponseType.DATA_URI:
      const binaryData = await httpResponse.blob();
      return blobToBase64(binaryData);
  }
});

/**
 * Saving history of translations
 */
onMessage(MessageType.SAVE_TO_HISTORY, async (payload: SaveToHistoryPayload) => {
  await loadHistory();
  const storageItem = toStorageItem(payload.translation);
  importHistory(storageItem);
});

/**
 * Handling saved translations from history without http-traffic
 */
onMessage(MessageType.GET_FROM_HISTORY, async (payload: TranslatePayload) => {
  await loadHistory(); // preload once

  const { text, from, to, vendor } = payload;
  const translationId = generateId(text, from, to);
  const storageItem: IHistoryStorageItem = historyStorage.toJS().translations[translationId]?.[vendor];

  return toTranslationResult(storageItem);
});

/**
 * Handling chrome.tts apis for user-script pages and options (app) page
 */
onMessage(MessageType.CHROME_TTS_PLAY, (payload: ChromeTtsPayload) => {
  const { text, lang, rate = 1.0 } = payload;
  chrome.tts.speak(text, { lang, rate, });
});

onMessage(MessageType.CHROME_TTS_STOP, () => {
  chrome.tts.stop();
});
