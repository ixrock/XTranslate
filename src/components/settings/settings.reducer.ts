import { Action } from "../../store/store.types";
import { actionTypes } from './settings.actions'
import { defaultSettings } from './settings.default'
import { ISettingsState } from "./settings.types";

export function settingsReducer(state = defaultSettings, action: Action<ISettingsState>) {
  var { data, type } = action;

  switch (type) {
    case actionTypes.SETTINGS_SYNC:
      return { ...state, ...data }
  }
  return state;
}