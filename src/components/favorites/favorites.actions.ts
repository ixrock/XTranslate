import { bindActions, ActionsDispatcher } from '../../store/bindActions'
import { enumUniq } from '../../utils/enumUniq'
import { IFavoritesState } from './favorites.types'
import { storage } from '../../store'

export enum actionTypes {
  FAVORITES_SYNC,
}

enumUniq(actionTypes);

@bindActions
class FavoritesActions extends ActionsDispatcher {
  sync(favorites: IFavoritesState) {
    return Promise.resolve({
      type: actionTypes.FAVORITES_SYNC,
      promise: storage.sync.set({ favorites: favorites }).then(() => favorites)
    }) as Promise<IFavoritesState>;
  }
}

export const favoritesActions = new FavoritesActions();
export default favoritesActions;