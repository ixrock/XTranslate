import { isProduction } from "./common";
import { onMessage, runtimeErrorCheck } from "./extension/runtime";
import { StorageAdapter, StorageHelper, StorageObservableOptions } from "./utils/storageHelper";
import { Message, MessageType, StorageStateChangePayload } from "./extension";
import { broadcastStorageStateChange } from "./extension/actions";

export interface CreateStorageOptions {
  autoLoad?: boolean; // default: true
  storageArea?: chrome.storage.StorageArea; // default: chrome.storage.local
  broadcastChanges?: boolean; // broadcasting storage updates to background and user-script pages, default: true
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
    broadcastChanges = true,
    storageArea = chrome.storage.local,
    observableOptions,
  } = opts;

  return new StorageHelper<T>(key, {
    autoInit: autoLoad,
    observable: observableOptions,
    defaultValue: defaultValue,
    storage: createStorageAdapter<T>(storageArea, { broadcastChanges }),
  });
}

export function createStorageAdapter<T>(storage: chrome.storage.StorageArea, opts: { broadcastChanges?: boolean } = {}): StorageAdapter<T> {
  return {
    async setItem(key: string, value: T) {
      return new Promise(resolve => {
        storage.set({ [key]: value }, () => {
          resolve(runtimeErrorCheck());
        })
      })
    },
    // loads data once on storage-helper's init
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
      if (opts.broadcastChanges) {
        if (!isProduction) {
          console.info(`[storage-adapter]: broadcasting "${key}"`, value);
        }
        broadcastStorageStateChange<T>({
          key: key,
          state: value,
          storageArea: storage === chrome.storage.local ? "local" : "sync",
        });
      }
    },
  };
}

// TODO: merge changes into storages / find by storage-area + key at some registry
// Subscribe for storage updates via chrome.runtime messaging
onMessage(({ type, payload }: Message<StorageStateChangePayload>, sender, sendResponse) => {
  if (type === MessageType.STORAGE_SYNC_STATE) {
    const { key, storageArea, state } = payload ?? {};
    console.info(`[runtime]: storage update for "${key}"`, { payload, location: location.href });
  }
});
