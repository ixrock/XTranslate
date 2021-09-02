import { find, flatten, orderBy, remove } from "lodash"
import { autoBind } from "../../utils";
import { getTranslators } from "../../vendors";
import { createStorageHelper } from "../../extension/storage";

export type FavoritesStorage = {
  [vendor: string]: FavoriteLangPair[];
}

export interface FavoriteLangPair {
  from: string
  to: string
}

export const favoritesStorage = createStorageHelper<FavoritesStorage>("favorites", {
  area: "sync",
  defaultValue: {},
});

export class FavoritesStore {
  private storage = favoritesStorage;
  ready = favoritesStorage.whenReady;

  constructor() {
    autoBind(this);
  }

  get data() {
    return this.storage.get();
  }

  getByVendor(vendor: string): FavoriteLangPair[] {
    return this.data[vendor] ?? [];
  }

  getFavorites() {
    return getTranslators()
      .filter(translator => this.getByVendor(translator.name).length > 0)
      .map(translator => {
        return {
          vendor: translator,
          favorites: orderBy(this.getByVendor(translator.name), [
            (fav: FavoriteLangPair) => fav.from !== "auto",
            'from'
          ])
        }
      })
  }

  isFavorite(vendor: string, langFrom: string, langTo: string) {
    return !!find(this.getByVendor(vendor), {
      from: langFrom,
      to: langTo
    });
  }

  addFavorite(vendor: string, fav: FavoriteLangPair) {
    var favorites = this.getByVendor(vendor);
    if (!this.isFavorite(vendor, fav.from, fav.to)) {
      this.data[vendor] = [...favorites, fav];
    }
  }

  removeFavorite(vendor: string, fav: FavoriteLangPair) {
    var favorites = this.getByVendor(vendor);
    remove(favorites, fav);
  }

  getCount(vendor?: string) {
    if (vendor) {
      return this.getByVendor(vendor).length;
    }
    return flatten(Object.values(this.data)).length;
  }

  reset() {
    this.storage.reset();
  }
}

export const favoritesStore = new FavoritesStore();