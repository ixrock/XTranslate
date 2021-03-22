import { isExtensionPage, onMessageType, runtimeErrorCheck, runtimeLogger } from "./extension/runtime";
import { StorageAdapter, StorageHelper, StorageObservableOptions } from "./utils/storageHelper";
import { MessageType, StorageChangePayload } from "./extension";
import { broadcastStorageChange } from "./extension/actions";

export interface CreateStorageOptions {
  autoLoad?: boolean; // default: true
  storageArea?: chrome.storage.StorageArea; // default: chrome.storage.local
  observableOptions?: StorageObservableOptions;
}

export function createSyncStorage<T>(key: string, defaultValue?: T, options: CreateStorageOptions = {}) {
  return createStorage<T>(key, defaultValue, {
    storageArea: chrome.storage.sync,
    ...options,
  });
}

export function createStorage<T>(key: string, defaultValue?: T, opts: CreateStorageOptions = {}) {
  const {
    autoLoad = true,
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
  onMessageType<StorageChangePayload>(MessageType.STORAGE_CHANGE, ({ payload }) => {
    const isCurrentStorage = storageArea === chrome.storage[payload.storageArea] && key === payload.key;
    if (!isCurrentStorage || !storageHelper.initialized) return;
    if (!storageHelper.isEqual(payload.state)) {
      runtimeLogger.info(`storage update for "${payload.key}"`, payload);
      storageHelper.merge(payload.state);
    }
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
    onChange({ key, value }: { key: string; value: T }) {
      if (!isExtensionPage()) {
        return; // skip in content-page scripts
      }
      broadcastStorageChange<T>({
        key: key,
        state: value,
        storageArea: storage === chrome.storage.local ? "local" : "sync",
      });
    },
  };
}
