import { combineReducers } from 'redux'
import { settingsReducer } from '../components/settings/settings.reducer'
import { themeManagerReducer } from '../components/theme-manager/theme-manager.reducer'
import { favoritesReducer } from '../components/favorites/favorites.reducer'

export const rootReducer = combineReducers({
  settings: settingsReducer,
  theme: themeManagerReducer,
  favorites: favoritesReducer,
});