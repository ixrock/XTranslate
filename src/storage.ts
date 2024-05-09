// Persistent storage helper

import { createLogger } from "./utils/createLogger";
import { StorageAdapter, StorageHelper, StorageHelperOptions } from "./utils/storageHelper";
import { readFromExternalStorageAction, removeFromExternalStorageAction, writeToExternalStorageAction } from "./extension/actions";
import { isBackgroundWorker, MessageType, onMessage, StorageSyncPayload, StorageWritePayload } from "./extension";
import { readFromExternalStorage, removeFromExternalStorage, StorageArea, writeToExternalStorage } from "./background/storage.bgc";

const logger = createLogger({ systemPrefix: "STORAGE(helper)" });

export interface ChromeStorageHelperOptions<T> extends Omit<StorageHelperOptions<T>, "storageAdapter"> {
  area?: StorageArea;
}

export function createStorage<T>(key: string, options: ChromeStorageHelperOptions<T>) {
  const {
    area = "local",
    autoLoad = false,
    ...storageOptions
  } = options;

  const storageAdapter: StorageAdapter<T> = {
    setItem(key: string, value: T) {
      const payload: StorageWritePayload<T> = {
        key, area, state: value,
        origin: location?.href
      };
      if (isBackgroundWorker()) {
        return writeToExternalStorage(payload);
      }
      return writeToExternalStorageAction(payload);
    },

    async getItem(key: string): Promise<T> {
      if (isBackgroundWorker()) {
        return readFromExternalStorage({ area, key });
      }
      return readFromExternalStorageAction({ area, key });
    },

    async removeItem(key: string) {
      if (isBackgroundWorker()) {
        return removeFromExternalStorage({ area, key });
      }
      return removeFromExternalStorageAction({ area, key });
    },
  };

  const storageHelper = new StorageHelper<T>(key, {
    ...storageOptions,
    storageAdapter,
  });

  onMessage(MessageType.STORAGE_DATA_SYNC, async (payload: StorageSyncPayload<T>) => {
    const eventOrigin = globalThis.location?.href;
    const storageKeyMatched = payload.key === storageHelper.key;
    const sameArea = payload.area === area;
    const differentOrigin = payload.origin !== eventOrigin;

    if (storageKeyMatched && sameArea && differentOrigin) {
      logger.info("data sync", {
        eventOrigin,
        payload,
      });

      storageHelper.set(payload.state, {
        silent: true, // don't save back to persistent storage
      });
    }
  });

  return storageHelper;
}
