import { reaction, toJS } from "mobx";
import { isProduction } from "./common";
import { runtimeErrorCheck } from "./extension/runtime";
import { StorageAdapter, StorageHelper, StorageObservabilityOptions } from "./utils/storageHelper";

export interface CreateStorageOptions {
  autoLoad?: boolean; // default: true
  storageArea?: chrome.storage.StorageArea; // default: chrome.storage.local
  observableOptions?: StorageObservabilityOptions;
}

export function createStorage<T>(key: string, defaultValue?: T, opts: CreateStorageOptions = {}) {
  const { autoLoad = true, storageArea = chrome.storage.local, observableOptions } = opts;
  const storageAdapter = createStorageAdapter<T>(storageArea);

  const storage = new StorageHelper<T>(key, {
    autoInit: autoLoad,
    storage: storageAdapter,
    observable: observableOptions,
    defaultValue: defaultValue,
  });

  // manually track data changes & bind auto-saving for with deep direct data updates
  // e.g. settingsStore.data.theme = "dark"
  storage.whenReady.then(() => {
    reaction(() => toJS(storage.get()), data => {
      if (!isProduction) {
        console.info(`[STORE]: "${key}" updated`, data);
      }
      storageAdapter.setItem(key, data);
    });
  });

  return storage;
}

export function createSyncStorage<T>(key: string, defaultValue?: T, options: CreateStorageOptions = {}) {
  return createStorage<T>(key, defaultValue, {
    storageArea: chrome.storage.sync,
    ...options,
  });
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
