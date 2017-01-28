import { ISettingsState } from '../components/settings/settings.types'
import { IThemeManagerState } from '../components/theme-manager/theme-manager.types'
import { IFavoritesState } from '../components/favorites/favorites.types'
import { ITranslationHistory } from "../components/user-history/user-history.types";

// sync
export interface AppState {
  settings?: ISettingsState
  theme?: IThemeManagerState
  favorites?: IFavoritesState
}

// local
export interface LocalState {
  history: ITranslationHistory[]
}