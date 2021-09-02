// Chrome storages api helper
import { checkErrors } from "./runtime";
import { StorageHelper, StorageMigrationCallback } from "../utils/storageHelper";
import { createLogger } from "../utils/createLogger";

export type StorageArea = "local" | "sync";

export interface ChromeStorageHelperOptions<T> {
  defaultValue?: T;
  area?: StorageArea; // corresponding chrome.storage[area], default: "local"
  autoLoad?: boolean; // preload data from storage immediately, default: true
  autoSync?: boolean; // sync data changes to chrome.storage[area], default: true
  migrations?: StorageMigrationCallback<T>[];
}

export function createStorageHelper<T>(key: string, options: ChromeStorageHelperOptions<T> = {}) {
  const {
    autoLoad = true,
    autoSync = true,
    area = "local",
    defaultValue,
    migrations,
  } = options;

  const logger = createLogger({
    systemPrefix: `[${area.toUpperCase()}]: chrome.storage["${key}"]`,
  });

  const chromeStorage = chrome.storage[area];

  const storageHelper = new StorageHelper<T>(key, {
    autoInit: autoLoad,
    autoSync: autoSync,
    defaultValue,
    migrations,
    storage: {
      async setItem(key: string, value: T) {
        return new Promise(resolve => {
          chromeStorage.set({ [key]: value }, () => resolve(checkErrors()))
        })
      },
      async getItem(key: string): Promise<T> {
        return new Promise(resolve => {
          chromeStorage.get(key, items => resolve(checkErrors(items[key])))
        });
      },
      async removeItem(key: string) {
        return new Promise(resolve => {
          chromeStorage.remove(key, () => resolve(checkErrors()));
        })
      },
    },
  });

  chrome.storage.onChanged.addListener((changes, areaName: StorageArea) => {
    if (area !== areaName || !changes[key] || !storageHelper.loaded) return;
    const { newValue: storageState } = changes[key];
    const isUpdateRequired = !storageHelper.isEqual(storageState);

    logger.info(`received update`, { isUpdateRequired, ...changes });
    if (isUpdateRequired) {
      storageHelper.set(storageState);
    }
  });

  return storageHelper;
}
