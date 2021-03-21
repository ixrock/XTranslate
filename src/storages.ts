import { debounce } from "lodash";
import { runtimeErrorCheck } from "./extension/runtime";
import { StorageAdapter, StorageHelper, StorageObservableOptions } from "./utils/storageHelper";
import { isProduction } from "./common";

export interface CreateStorageOptions {
  autoLoad?: boolean; // default: true
  storageArea?: chrome.storage.StorageArea; // default: chrome.storage.local
  observableOptions?: StorageObservableOptions;
  syncFromChromeStorage?: boolean; // auto-sync changes from chrome.storage, default: true
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
    syncFromChromeStorage = false, // fixme: make proper sync via chrome.storage or chrome.runtime
    observableOptions,
  } = opts;

  const storageHelper = new StorageHelper<T>(key, {
    autoInit: autoLoad,
    observable: observableOptions,
    defaultValue: defaultValue,
    storage: createStorageAdapter<T>(storageArea),
  });

  // handle data changes from chrome.storage
  if (syncFromChromeStorage) {
    chrome.storage.onChanged.addListener(debounce((changes, areaName) => {
      var isCurrent = chrome.storage[areaName] === storageArea && changes[key];
      if (!isCurrent || !storageHelper.initialized) return; // skip
      if (!isProduction) {
        console.info(`[chrome.storage]: changed "${key}"`, { ...changes[key], areaName, });
      }
      const { newValue } = changes[key];
      const isEmpty = newValue == null;
      const isDefault = !storageHelper.isDefault(newValue);

      if (isEmpty && isDefault) {
        storageHelper.merge(newValue);
      }
    }, 250));
  }

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
    }
  };
}
