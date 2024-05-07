// Chrome storages api helper

import { StorageHelper, StorageHelperOptions } from "./utils/storageHelper";
import { deleteFromExternalStorage, readFromExternalStorage, writeToExternalStorage } from "./extension/actions";
import { isFirefox } from "./common-vars";
import { MessageType, onMessage, StorageSyncPayload } from "./extension";
import { createLogger } from "./utils";

export interface ChromeStorageHelperOptions<T> extends Omit<StorageHelperOptions<T>, "storageAdapter"> {
  area?: chrome.storage.AreaName;
}

export function createStorageHelper<T>(key: string, options: ChromeStorageHelperOptions<T>) {
  const {
    area = "local",
    autoLoad = false,
    defaultValue,
    migrations,
  } = options;

  const storageHelper = new StorageHelper<T>(key, {
    autoLoad,
    defaultValue,
    migrations,
    storageAdapter: {
      setItem(key: string, value: T) {
        return writeToExternalStorage({
          key,
          area,
          state: value,
          origin: location?.href,
        });
      },
      async getItem(key: string): Promise<T> {
        return readFromExternalStorage({ area, key });
      },
      async removeItem(key: string) {
        return deleteFromExternalStorage({ area, key });
      },
    },
  });

  onMessage(MessageType.STORAGE_DATA_SYNC, async (payload: StorageSyncPayload<T>) => {
    const storageKeyMatched = payload.key === storageHelper.key;
    const sameArea = payload.area === area;
    const differentWindow = payload.origin !== location?.href;

    if (storageKeyMatched && sameArea && differentWindow) {
      const logger = createLogger({ systemPrefix: "STORAGE_DATA_SYNC" });

      logger.info({
        origin: location?.href,
        payload,
        anotherWindowTab: differentWindow,
      });

      storageHelper.set(payload.state, {
        silent: true, // don't save back to persistent storage
      });
    }
  });

  return storageHelper;
}

export function getExtensionStorageApi(area: chrome.storage.AreaName = "local") {
  return isFirefox()
    ? chrome.storage.local // TODO: support "sync" for firefox (maybe it's disabled only in dev-mode)
    : chrome.storage[area];
}