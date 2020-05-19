import { find, flatten, orderBy, remove } from "lodash"
import { Store } from "../../store";
import { autobind } from "../../utils";
import { getTranslators } from "../../vendors";

export type IFavoritesStoreData = {
  [vendor: string]: IFavorite[];
}

export interface IFavorite {
  from: string
  to: string
}

@autobind()
export class FavoritesStore extends Store<IFavoritesStoreData> {
  constructor() {
    super({
      id: "favorites",
      storageType: "sync",
      initialData: {},
    })
  }

  getByVendor(vendor: string): IFavorite[] {
    return this.data[vendor] || [];
  }

  getFavorites() {
    return getTranslators()
      .filter(translator => this.getByVendor(translator.name).length > 0)
      .map(translator => {
        return {
          vendor: translator,
          favorites: orderBy(this.getByVendor(translator.name), [
            (fav: IFavorite) => fav.from !== "auto",
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

  addFavorite(vendor: string, fav: IFavorite) {
    var favorites = this.getByVendor(vendor);
    if (!this.isFavorite(vendor, fav.from, fav.to)) {
      this.data[vendor] = [...favorites, fav];
    }
  }

  removeFavorite(vendor: string, fav: IFavorite) {
    var favorites = this.getByVendor(vendor);
    remove(favorites, fav);
  }

  getCount(vendor?: string) {
    if (vendor) {
      return this.getByVendor(vendor).length;
    }
    return flatten(Object.values(this.data)).length;
  }
}

export const favoritesStore = new FavoritesStore();