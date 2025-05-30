//-- History items management

import { runInAction } from "mobx";
import { createLogger, disposer } from "../utils";
import type { ITranslationResult } from "../providers/translator";
import { MessageType, SaveToFavoritesPayload, SaveToHistoryPayload, TranslatePayload } from '../extension/messages'
import { isBackgroundWorker, onMessage, sendMessage } from '../extension/runtime'
import { settingsStorage } from "../components/settings/settings.storage";
import { generateId, getHistoryItemId, historyStorage, type IHistoryItem, IHistoryStorageItem, importHistory, toHistoryItem, toStorageItem, toTranslationResult } from "../components/user-history/history.storage";
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
  await historyStorage.load();

  const { text, from, to, provider } = payload;
  const translationId = generateId(text, from, to);
  const storageItem: IHistoryStorageItem = historyStorage.toJS().translations[translationId]?.[provider];

  if (storageItem) {
    const result = toTranslationResult(storageItem);
    logger.info("handling translation from history item lookup", { result, payload });
    return result;
  }
}

export function saveToHistoryAction(translation: ITranslationResult | IHistoryItem) {
  if (isBackgroundWorker()) {
    return saveToHistory({ translation });
  }

  return sendMessage<SaveToHistoryPayload, ITranslationResult>({
    type: MessageType.SAVE_TO_HISTORY,
    payload: {
      translation,
    },
  });
}

export function saveToFavoritesAction(item: ITranslationResult | IHistoryItem, { isFavorite = true } = {}) {
  if (isBackgroundWorker()) {
    return saveToFavorites({ item, isFavorite });
  }

  return sendMessage<SaveToFavoritesPayload>({
    type: MessageType.SAVE_TO_FAVORITES,
    payload: {
      item: item,
      isFavorite: isFavorite,
    },
  });
}

export async function getTranslationFromHistoryAction(payload: TranslatePayload) {
  if (payload.from === "auto") {
    return; // skip: source-language always saved as detected-language in history
  }

  if (isBackgroundWorker()) {
    return getHistoryItemOffline(payload);
  }

  return sendMessage<TranslatePayload, ITranslationResult | void>({
    type: MessageType.GET_FROM_HISTORY,
    payload,
  });
}
