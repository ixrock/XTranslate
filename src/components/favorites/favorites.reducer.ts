import { Action } from "../../store";
import { actionTypes } from './favorites.actions'
import { defaultFavorites } from './favorites.default'
import { IFavoritesState } from "./favorites.types";

export function favoritesReducer(state = defaultFavorites, action: Action<IFavoritesState>) {
  var { data, type } = action;

  switch (type) {
    case actionTypes.FAVORITES_SYNC:
      return { ...state, ...data }
  }
  return state;
}