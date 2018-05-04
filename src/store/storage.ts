import { IAppState, ILocalState } from './store.types'
import { Storage } from '../extension/storage'

export const storage = new Storage<IAppState, ILocalState>();
