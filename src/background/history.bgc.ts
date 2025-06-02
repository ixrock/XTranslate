//-- History items management

import { runInAction } from "mobx";
import { createLogger } from "../utils";
import { createIsomorphicAction, MessageType, SaveToFavoritesPayload, SaveToHistoryPayload, TranslatePayload } from "../extension";
import { settingsStorage } from "../components/settings/settings.storage";
import { generateId, getHistoryItemId, historyStorage, IHistoryStorageItem, importHistory, toHistoryItem, toStorageItem, toTranslationResult } from "../components/user-history/history.storage";
import { favoritesStorage } from "../components/user-history/favorites.storage";

const logger = createLogger({ systemPrefix: '[HISTORY]' });

export const saveToHistoryAction = createIsomorphicAction({
  messageType: MessageType.SAVE_TO_HISTORY,
  handler: saveToHistory,
});

export const saveToFavoritesAction = createIsomorphicAction({
  messageType: MessageType.SAVE_TO_FAVORITES,
  handler: saveToFavorites,
});

export const getTranslationFromHistoryAction = createIsomorphicAction({
  messageType: MessageType.GET_FROM_HISTORY,
  handler: getHistoryItemOffline,
});

export async function saveToHistory({ translation }: SaveToHistoryPayload) {
  await Promise.all([
    settingsStorage.load(),
    historyStorage.load(),
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
    historyStorage.load(),
    favoritesStorage.load(),
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
  const { text, from, to, provider } = payload;
  if (from === "auto") return; // skip: source-language always saved as detected-language in history

  await historyStorage.load();

  const translationId = generateId(text, from, to);
  const storageItem: IHistoryStorageItem = historyStorage.toJS().translations[translationId]?.[provider];

  if (storageItem) {
    const result = toTranslationResult(storageItem);
    logger.info("handling translation from history item lookup", { result, payload });
    return result;
  }
}
