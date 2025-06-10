//-- History items management

import { runInAction } from "mobx";
import { createLogger } from "../utils";
import { createIsomorphicAction, MessageType, SaveToFavoritesPayload, SaveToHistoryPayload, TranslatePayload } from "../extension";
import { settingsStorage } from "../components/settings/settings.storage";
import { generateId, getHistoryItemId, historyStorage, IHistoryStorageItem, importHistory, toHistoryItem, toStorageItem, toTranslationResult } from "../components/user-history/history.storage";
import { favoritesStorage } from "../components/user-history/favorites.storage";
import { sendMetric } from "./metrics.bgc";

const logger = createLogger({ systemPrefix: "[HISTORY]" });

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

export async function saveToHistory({ translation, source }: SaveToHistoryPayload) {
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

  if (source) {
    void sendMetric("history_saved", {
      source: source,
      provider: translation.vendor,
      lang_from: translation.langFrom,
      lang_to: translation.langTo,
    });
  }
}

export async function saveToFavorites({ item, isFavorite, source }: SaveToFavoritesPayload) {
  await Promise.all([
    historyStorage.load(),
    favoritesStorage.load(),
  ]);

  const itemId = getHistoryItemId(item);
  const { translations } = historyStorage.get();
  const { favorites } = favoritesStorage.get();
  let savedItem = toHistoryItem(translations[itemId]?.[item.vendor]);

  logger.info(`marking item as favorite: ${isFavorite}`, item);
  runInAction(() => {
    favorites[itemId] ??= {};
    favorites[itemId][item.vendor] = isFavorite;
  });

  if (!savedItem) {
    const savingItem = toStorageItem(item);
    savedItem = toHistoryItem(savingItem);
    logger.info(`saving item(${itemId}) to history because favorite`, savingItem);
    importHistory(savingItem);
  }

  if (isFavorite && source) {
    void sendMetric("favorite_saved", {
      source: source,
      provider: savedItem.vendor,
      lang_from: savedItem.from,
      lang_to: savedItem.to,
    })
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
