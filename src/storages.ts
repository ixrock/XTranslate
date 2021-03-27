import { isExtensionPage, onMessageType, runtimeErrorCheck, runtimeLogger } from "./extension/runtime";
import { StorageAdapter, StorageHelper, StorageObservableOptions } from "./utils/storageHelper";
import { MessageType, StoragePayload } from "./extension";
import { broadcastStorage } from "./extension/actions";

export interface CreateStorageOptions<T> {
  autoSave?: boolean;
  autoLoad?: boolean; // preload data from storage immediately, default: true
  sync?: boolean; // receive storage updates via chrome.runtime, default: true
  storageArea?: chrome.storage.StorageArea; // chrome's storage area, default: chrome.storage.local
  observableOptions?: StorageObservableOptions;
  onSync?(state: T): void; // allows to process remote changes manually with "sync:false"
}

export function createSyncStorage<T>(key: string, defaultValue?: T, options: CreateStorageOptions<T> = {}) {
  return createStorage<T>(key, defaultValue, {
    storageArea: chrome.storage.sync,
    ...options,
  });
}

export function createStorage<T>(key: string, defaultValue?: T, opts: CreateStorageOptions<T> = {}) {
  const {
    autoLoad = true,
    autoSave = true, // to remote storage on change
    sync = true, // from remote storage
    storageArea = chrome.storage.local,
    observableOptions,
    onSync,
  } = opts;

  const storageHelper = new StorageHelper<T>(key, {
    autoInit: autoLoad,
    autoSave: autoSave,
    observable: observableOptions,
    defaultValue: defaultValue,
    storage: createStorageAdapter<T>(storageArea),
  });

  // subscribe for updates via chrome.runtime messaging
  onMessageType<StoragePayload>(MessageType.STORAGE_UPDATE, ({ payload }) => {
    const isCurrentStorage = storageArea === chrome.storage[payload.storageArea] && key === payload.key;
    if (!isCurrentStorage || !storageHelper.initialized) return;
    if (storageHelper.isEqual(payload.state)) return; // not changed
    if (sync) {
      runtimeLogger.info(`storage update for "${payload.key}"`, payload);
      storageHelper.set(payload.state);
    }
    onSync?.(payload.state);
  });

  return storageHelper;
}

export function createStorageAdapter<T>(storage: chrome.storage.StorageArea): StorageAdapter<T> {
  return {
    async setItem(key: string, value: T) {
      return new Promise(resolve => {
        storage.set({ [key]: value }, () => {
          resolve(runtimeErrorCheck());
        })
      })
    },
    // loads data once on storage-helper init
    async getItem(key: string): Promise<T> {
      return new Promise(resolve => {
        storage.get(key, items => {
          let data: any | { data?: T } = items[key];
          const loadedData: T = data?.data ?? data;
          resolve(runtimeErrorCheck(loadedData));
        })
      });
    },
    async removeItem(key: string) {
      return new Promise(resolve => {
        storage.remove(key, () => {
          resolve(runtimeErrorCheck());
        });
      })
    },
    onChange({ key, value }) {
      if (!isExtensionPage()) {
        return; // skip in content-page scripts
      }

      broadcastStorage<T>({
        key: key,
        state: value,
        storageArea: storage === chrome.storage.local ? "local" : "sync",
      });
    },
  };
}
