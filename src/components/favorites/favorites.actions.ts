import { bindActions } from "../../store/bindActions";
import { enumUniq } from "../../utils/enumUniq";
import { IFavoritesState } from "./favorites.types";
import { storage } from "../../store/storage";

export enum actionTypes {
  FAVORITES_SYNC,
}

enumUniq(actionTypes);

export const favoritesActions = bindActions({
  async sync(favorites: IFavoritesState) {
    return {
      type: actionTypes.FAVORITES_SYNC,
      promise: storage.sync.set({ favorites: favorites }).then(() => favorites)
    } as any as IFavoritesState;
  }
});
