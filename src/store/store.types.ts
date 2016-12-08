import { ISettingsState } from '../components/settings/settings.types'
import { IThemeManagerState } from '../components/theme-manager/theme-manager.types'
import { IFavoritesState } from '../components/favorites/favorites.types'

export interface AppState {
  settings?: ISettingsState
  theme?: IThemeManagerState
  favorites?: IFavoritesState
}