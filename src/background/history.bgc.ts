//-- History items management

import { runInAction } from "mobx";
import { createLogger, disposer } from "../utils";
import { MessageType, onMessage, SaveToFavoritesPayload, SaveToHistoryPayload } from '../extension'
import { settingsStorage } from "../components/settings/settings.storage";
import { generateId, getHistoryItemId, historyStorage, IHistoryStorageItem, importHistory, toHistoryItem, toStorageItem, toTranslationResult } from "../components/user-history/history.storage";
import { TranslatePayload } from "../vendors";
import { favoritesStorage } from "../components/user-history/favorites.storage";

const logger = createLogger({ systemPrefix: '[BACKGROUND(history)]' });

export function listenTranslationHistoryActions() {
  return disposer(
    onMessage(MessageType.SAVE_TO_HISTORY, saveToHistory),
    onMessage(MessageType.SAVE_TO_FAVORITES, saveToFavorites),
    onMessage(MessageType.GET_FROM_HISTORY, getHistoryItemOffline),
  );
}

export async function saveToHistory({ translation }: SaveToHistoryPayload) {
  await Promise.all([
    settingsStorage.load({ force: true }),
    historyStorage.load({ force: true }),
  ]);

  const hasDictionary = translation.dictionary?.length > 0;
  const { historySaveWordsOnly } = settingsStorage.get();
  if (historySaveWordsOnly && !hasDictionary) {
    return; // skip saving
  }

  const savingItem = toStorageItem(translation);
  logger.info("saving item to history", savingItem);
  importHistory(savingItem);
}

export async function saveToFavorites({ item, isFavorite }: SaveToFavoritesPayload) {
  await Promise.all([
    historyStorage.load({ force: true }),
    favoritesStorage.load({ force: true }),
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
}

export async function getHistoryItemOffline(payload: TranslatePayload) {
  await historyStorage.load({ force: true });

  const { text, from, to, vendor } = payload;
  const translationId = generateId(text, from, to);
  const storageItem: IHistoryStorageItem = historyStorage.toJS().translations[translationId]?.[vendor];

  if (storageItem) {
    const result = toTranslationResult(storageItem);
    logger.info("handling translation from history item lookup", { result, payload });
    return result;
  }
}

