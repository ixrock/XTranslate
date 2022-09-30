// Chrome storages api helper
import { getBrowserInfo } from "./runtime";
import { createLogger } from "../utils/createLogger";
import { StorageHelper, StorageHelperOptions } from "../utils/storageHelper";

export interface ChromeStorageHelperOptions<T> extends Omit<StorageHelperOptions<T>, "storage"> {
  area?: chrome.storage.AreaName;
}

export function createStorageHelper<T>(key: string, options: ChromeStorageHelperOptions<T>) {
  const {
    area = "local",
    autoLoad = false,
    autoSyncDelay = 250,
    defaultValue,
    migrations,
  } = options;

  const logger = createLogger({ systemPrefix: `[StorageHelperLocal]` });
  const browserStorage = getBrowserInfo().isFirefox
    ? chrome.storage.local // TODO: support "sync" for firefox (maybe it's disabled only in dev-mode)
    : chrome.storage[area];

  let storageResourceVersion = 1;
  const metadataVersionKey = `${key}@version`;

  const storageHelper = new StorageHelper<T>(key, {
    autoLoad,
    autoSyncDelay,
    defaultValue,
    migrations,
    storage: {
      async setItem(key: string, value: T) {
        return new Promise(resolve => {
          browserStorage.set({
            [key]: value,
            [metadataVersionKey]: ++storageResourceVersion,
          }, resolve)
        })
      },
      async getItem(key: string): Promise<T> {
        return new Promise(resolve => {
          browserStorage.get([key, metadataVersionKey], (items = {}) => {
            storageResourceVersion = Math.max(storageResourceVersion, items[metadataVersionKey] ?? 0);
            resolve(items[key]);
          })
        });
      },
      async removeItem(key: string) {
        return new Promise(resolve => {
          browserStorage.remove([key, metadataVersionKey], resolve);
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

    logger.info("update", {
      origin: location.href,
      isUpdateRequired,
      ...changes
    });
    if (isUpdateRequired) {
      storageResourceVersion = resourceVersion; // refresh to latest version
      storageHelper.set(storageState, {
        silent: true, // skip auto-saving back to chrome.storage
      });
    }
  });

  return storageHelper;
}
