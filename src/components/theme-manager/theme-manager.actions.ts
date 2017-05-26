import { bindActions } from "../../store/bindActions";
import { enumUniq } from "../../utils/enumUniq";
import { AppState, storage } from "../../store";
import { IThemeManagerState } from "./theme-manager.types";
import { defaultTheme } from "./theme-manager.default";

export enum actionTypes {
  THEME_SYNC,
  THEME_RESET,
}

enumUniq(actionTypes);

export const themeManagerActions = bindActions({
  sync(theme: IThemeManagerState) {
    return function (dispatch, getState) {
      dispatch({
        type: actionTypes.THEME_SYNC,
        data: theme
      });
      var state: AppState = getState();
      storage.sync.set({ theme: state.theme });
    }
  },

  reset() {
    storage.sync.set({ theme: defaultTheme });
    return {
      type: actionTypes.THEME_RESET,
      data: defaultTheme
    };
  }
})
