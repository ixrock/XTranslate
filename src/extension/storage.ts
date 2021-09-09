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

  let storageResourceVersion = 1;
  const chromeStorage = chrome.storage[area];
  const metadataVersionKey = `${key}@version`;

  const storageHelper = new StorageHelper<T>(key, {
    autoInit: autoLoad,
    autoSync: autoSync,
    defaultValue,
    migrations,
    storage: {
      async setItem(key: string, value: T) {
        return new Promise(resolve => {
          chromeStorage.set({
            [key]: value,
            [metadataVersionKey]: ++storageResourceVersion,
          }, () => resolve(checkErrors()))
        })
      },
      async getItem(key: string): Promise<T> {
        return new Promise(resolve => {
          chromeStorage.get([key, metadataVersionKey], items => {
            storageResourceVersion = Math.max(storageResourceVersion, items[metadataVersionKey] ?? 0);
            resolve(checkErrors(items[key]));
          })
        });
      },
      async removeItem(key: string) {
        return new Promise(resolve => {
          chromeStorage.remove([key, metadataVersionKey], () => resolve(checkErrors()));
        })
      },
    },
  });

  // sync storage updates from other processes (e.g. background-page)
  chrome.storage.onChanged.addListener((changes, areaName: StorageArea) => {
    if (area !== areaName || !changes[key] || !storageHelper.loaded) return;
    const { newValue: storageState } = changes[key];
    const resourceVersion = changes[metadataVersionKey]?.newValue;
    const isUpdateRequired = resourceVersion > storageResourceVersion;

    logger.info(`received update`, {
      isUpdateRequired,
      ...changes
    });
    if (isUpdateRequired) {
      storageResourceVersion = resourceVersion; // refresh
      storageHelper.set(storageState, {
        silent: true, // skip auto-saving back to chrome.storage
      });
    }
  });

  return storageHelper;
}
