import { vendorsList } from '../../vendors'
import { IFavoritesState } from './favorites.types'

export const defaultFavorites: IFavoritesState = vendorsList.reduce((list, vendor) => {
  list[vendor.name] = [];
  return list;
}, {});