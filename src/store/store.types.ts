import { ISettingsState } from '../components/settings/settings.types'
import { IThemeManagerState } from '../components/theme-manager/theme-manager.types'
import { IFavoritesState } from '../components/favorites/favorites.types'

export interface Action<D = any> {
  type: any
  data?: D
  error?: any
  waiting?: boolean
  silent?: boolean
  promise?: Promise<any>
  [param: string]: any
}

// cloud state (chrome.storage.sync)
export interface IAppState {
  settings: ISettingsState
  theme: IThemeManagerState
  favorites: IFavoritesState
}

// local state (chrome.storage.local)
export interface ILocalState {
  history: any[]
}