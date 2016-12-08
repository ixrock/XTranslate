import { commonReducer } from "../../utils/commonReducer";
import { actionTypes } from './theme-manager.actions'
import { defaultTheme } from './theme-manager.default'

export const themeManagerReducer = commonReducer(defaultTheme, (state, { data, error, type, waiting }) => {
  switch (type) {
    case actionTypes.THEME_SYNC:
    case actionTypes.THEME_RESET:
      Object.assign(state, data);
      break;
  }
});