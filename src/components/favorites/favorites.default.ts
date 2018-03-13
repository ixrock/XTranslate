import { vendors } from '../../vendors'
import { IFavoritesState } from './favorites.types'

export const defaultFavorites: IFavoritesState = vendors.reduce((list, vendor) => {
  list[vendor.name] = [];
  return list;
}, {});