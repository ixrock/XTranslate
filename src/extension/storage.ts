// Chrome storages api helper
import { checkErrors } from "./runtime";
import { createLogger, StorageHelper, StorageHelperOptions } from "../utils";

export interface ChromeStorageHelperOptions<T> extends Partial<StorageHelperOptions<T>> {
  area?: chrome.storage.AreaName; // default: "local"
}

export function createStorageHelper<T>(key: string, options: ChromeStorageHelperOptions<T>) {
  const {
    area = "local",
    autoLoad = true,
    autoSync = { delay: 250 },
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
    autoLoad,
    autoSync,
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
  chrome.storage.onChanged.addListener((changes, areaName) => {
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
