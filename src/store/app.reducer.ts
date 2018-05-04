import { combineReducers } from 'redux'
import { settingsReducer } from '../components/settings/settings.reducer'
import { themeManagerReducer } from '../components/theme-manager/theme-manager.reducer'
import { favoritesReducer } from '../components/favorites/favorites.reducer'
import { Action, IAppState } from "./store.types";

const rootReducer = combineReducers({
  settings: settingsReducer,
  theme: themeManagerReducer,
  favorites: favoritesReducer,
});

export function appReducer(state: IAppState, action: Action) {
  if (action.type === "APP_STATE_INIT") {
    state = action.initState;
  }
  return rootReducer(state, action);
}
