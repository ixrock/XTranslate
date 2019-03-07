import { Store } from "../../store";

export interface IFavoritesStore {
  [vendor: string]: IFavorite[];
}

export interface IFavorite {
  from: string
  to: string
}

export class FavoritesStore extends Store<IFavoritesStore> {
  protected id = "favorites";

  constructor() {
    super({
      storageType: "sync",
      initialData: {},
    })
  }

  getByVendor(vendorName: string): IFavorite[] {
    return this.data[vendorName] || [];
  }
}

export const favoritesStore = new FavoritesStore();