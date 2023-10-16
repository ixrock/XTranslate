// Chrome storages api helper

import { createLogger } from "../utils/createLogger";
import { StorageHelper, StorageHelperOptions } from "../utils/storageHelper";
import { isFirefox } from "../common-vars";
import isEqual from "lodash/isEqual";

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

  const logger = createLogger({ systemPrefix: `[Storage](key=${key})` });
  const browserStorage = isFirefox()
    ? chrome.storage.local // TODO: support "sync" for firefox (maybe it's disabled only in dev-mode)
    : chrome.storage[area];

  const storageHelper = new StorageHelper<T>(key, {
    autoLoad,
    autoSyncDelay,
    defaultValue,
    migrations,
    storage: {
      async setItem(key: string, value: T) {
        return new Promise(resolve => browserStorage.set({ [key]: value, }, resolve))
      },
      async getItem(key: string): Promise<T> {
        return new Promise(resolve => {
          browserStorage.get(key, (items = {}) => resolve(items[key]))
        });
      },
      async removeItem(key: string) {
        return new Promise(resolve => browserStorage.remove(key, resolve))
      },
    },
  });

  // sync storage updates from other processes (e.g. background-page)
  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    const { newValue: newState, oldValue: prevState } = changes[key] ?? {};

    // preload storage if not ready for some reasons
    await storageHelper.load();

    const storageState = storageHelper.toJS();
    const isUpdateRequired = areaName === area && newState && !isEqual(storageState, newState);

    if (isUpdateRequired) {
      logger.info("chrome.storage.onChanged (raw)", {
        origin: location.href,
        areaName,
        newState,
        prevState,
        storageHelper,
      });

      storageHelper.set(newState);
    }
  });

  return storageHelper;
}
