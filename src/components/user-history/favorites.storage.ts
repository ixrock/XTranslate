import type { ITranslationResult } from "../../vendors";
import type { HistoryRecord, IHistoryItem } from "./history.storage";
import { getHistoryItemId } from "./history.storage";
import { createStorageHelper } from "../../extension/storage";

export interface FavoriteStorageModel {
  favorites: HistoryRecord<boolean>;
}

export const favoritesStorage = createStorageHelper<FavoriteStorageModel>("favorites", {
  area: "local",
  defaultValue: {
    favorites: {},
  },
});

export function isFavorite(item: ITranslationResult | IHistoryItem): boolean {
  const itemId = getHistoryItemId(item);
  const { favorites } = favoritesStorage.get();

  return Boolean(favorites[itemId]?.[item.vendor]);
}
