import { Action } from "../../store/store.types";
import { actionTypes } from './theme-manager.actions'
import { defaultTheme } from './theme-manager.default'
import { IThemeManagerState } from "./theme-manager.types";

export function themeManagerReducer(state = defaultTheme, action: Action<IThemeManagerState>) {
  var { data, type } = action;

  switch (type) {
    case actionTypes.THEME_SYNC:
    case actionTypes.THEME_RESET:
      return { ...state, ...data }
  }
  return state;
}