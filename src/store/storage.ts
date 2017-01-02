import { AppState } from './store.types'
import { Storage } from '../extension/storage'
export const storage = new Storage<AppState>();