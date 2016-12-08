import { commonReducer } from "../../utils/commonReducer";
import { actionTypes } from './favorites.actions'
import { defaultFavorites } from './favorites.default'

export const favoritesReducer = commonReducer(defaultFavorites, (state, { data, error, type, waiting }) => {
  switch (type) {
    case actionTypes.FAVORITES_SYNC:
      return data;
  }
});