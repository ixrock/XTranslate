import { isExtensionPage, onMessageType, runtimeErrorCheck, runtimeLogger } from "./extension/runtime";
import { StorageAdapter, StorageHelper, StorageObservableOptions } from "./utils/storageHelper";
import { MessageType, StoragePayload } from "./extension";
import { broadcastStorage } from "./extension/actions";

export interface CreateStorageOptions<T> {
  autoLoad?: boolean; // preload data from storage immediately, default: true
  autoSync?: boolean; // receive storage updates via chrome.runtime, default: true
  storageArea?: chrome.storage.StorageArea; // chrome's storage area, default: chrome.storage.local
  observableOptions?: StorageObservableOptions;
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
    autoSync = true,
    storageArea = chrome.storage.local,
    observableOptions,
  } = opts;

  const storageHelper = new StorageHelper<T>(key, {
    autoInit: autoLoad,
    observable: observableOptions,
    defaultValue: defaultValue,
    storage: createStorageAdapter<T>(storageArea),
  });

  // subscribe for updates via chrome.runtime messaging
  onMessageType<StoragePayload>(MessageType.STORAGE_UPDATE, ({ payload }) => {
    const isCurrentStorage = storageArea === chrome.storage[payload.storageArea] && key === payload.key;
    const skip = !isCurrentStorage || !autoSync || !storageHelper.initialized;
    if (skip || storageHelper.isEqual(payload.state)) return;
    runtimeLogger.info(`storage update for "${payload.key}"`, payload);
    storageHelper.set(payload.state);
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
