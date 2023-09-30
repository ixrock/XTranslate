//-- Background service worker

import "../setup";
import { action, runInAction } from "mobx";
import { initContextMenus } from "./contextMenu";
import { isProduction } from "../common-vars";
import { blobToBase64DataUrl, createLogger, parseJson } from "../utils";
import { ChromeTtsPayload, MessageType, onInstall, onMessage, openOptionsPage, ProxyRequestPayload, ProxyResponsePayload, ProxyResponseType, SaveToFavorites, SaveToHistoryPayload } from '../extension'
import { rateLastTimestamp } from "../components/app/app-rate.storage";
import { settingsStorage } from "../components/settings/settings.storage";
import { generateId, getHistoryItemId, historyStorage, IHistoryStorageItem, importHistory, toHistoryItem, toStorageItem, toTranslationResult } from "../components/user-history/history.storage";
import { TranslatePayload } from "../vendors";
import { favoritesStorage } from "../components/user-history/favorites.storage";

const logger = createLogger({ systemPrefix: '[BACKGROUND]' });

onInstall((reason) => {
  if (reason === "install" || !isProduction) {
    rateLastTimestamp.set(Date.now());
    openOptionsPage();
  }
});

/**
 * Create browser's context menu item (if enabled in extension settings, default: false)
 */
initContextMenus();

/**
 * Network proxy for `options` and `content-script` pages (to avoid CORS, etc.)
 */
onMessage(MessageType.PROXY_REQUEST, async ({ url, responseType, requestInit }: ProxyRequestPayload) => {
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
});

/**
 * Saving history of translations
 */
onMessage(MessageType.SAVE_TO_HISTORY, async ({ translation }: SaveToHistoryPayload) => {
  await Promise.all([
    settingsStorage.load({ skipIfLoaded: true }),
    historyStorage.load({ skipIfLoaded: true }),
  ]);

  const hasDictionary = translation.dictionary?.length > 0;
  const { historySaveWordsOnly } = settingsStorage.get();
  if (historySaveWordsOnly && !hasDictionary) {
    return; // skip saving
  }

  const savingItem = toStorageItem(translation);
  logger.info("saving item to history", savingItem);
  importHistory(savingItem);
});

/**
 * Handling favorite state of history items
 */
onMessage(MessageType.SAVE_TO_FAVORITES, action(async ({ item, isFavorite }: SaveToFavorites) => {
  await Promise.all([
    historyStorage.load({ skipIfLoaded: true }),
    favoritesStorage.load({ skipIfLoaded: true }),
  ]);

  const itemId = getHistoryItemId(item);
  const { translations } = historyStorage.get();
  const { favorites } = favoritesStorage.get();
  const savedItem = toHistoryItem(translations[itemId]?.[item.vendor]);

  logger.info(`marking item as favorite: ${isFavorite}`, item);
  runInAction(() => {
    favorites[itemId] ??= {};
    favorites[itemId][item.vendor] = isFavorite;
  });

  if (!savedItem) {
    const savingItem = toStorageItem(item);
    logger.info(`saving item(${itemId}) to history because favorite`, savingItem);
    importHistory(savingItem);
  }
}));

/**
 * Handling saved translations from history without http-traffic
 */
onMessage(MessageType.GET_FROM_HISTORY, async (payload: TranslatePayload) => {
  await historyStorage.load();

  const { text, from, to, vendor } = payload;
  const translationId = generateId(text, from, to);
  const storageItem: IHistoryStorageItem = historyStorage.toJS().translations[translationId]?.[vendor];

  if (storageItem) {
    const result = toTranslationResult(storageItem);
    logger.info("handling translation from history item lookup", { result, payload });
    return result;
  }
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
