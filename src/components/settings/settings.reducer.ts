import { commonReducer } from "../../utils/commonReducer";
import { actionTypes } from './settings.actions'
import { defaultSettings } from './settings.default'

export const settingsReducer = commonReducer(defaultSettings, (state, { data, error, type, waiting }) => {
  switch (type) {
    case actionTypes.SETTINGS_SYNC:
      Object.assign(state, data);
      break;
  }
});