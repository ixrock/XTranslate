// Persistent storage helper

import { createLogger } from "./utils/createLogger";
import { StorageAdapter, StorageHelper, StorageHelperOptions } from "./utils/storageHelper";
import { readFromExternalStorageAction, removeFromExternalStorageAction, writeToExternalStorageAction } from "./extension/actions";
import { MessageType, onMessage, StorageSyncPayload, StorageWritePayload } from "./extension";
import { StorageArea } from "./background/storage.bgc";

const logger = createLogger({ systemPrefix: "STORAGE(helper)" });

export interface ChromeStorageHelperOptions<T> extends Omit<StorageHelperOptions<T>, "storageAdapter"> {
  area?: StorageArea;
}

export function createStorage<T>(key: string, options: ChromeStorageHelperOptions<T>) {
  const {
    area = "local",
    ...storageOptions
  } = options;

  const storageAdapter: StorageAdapter<T> = {
    setItem(key: string, value: T) {
      const payload: StorageWritePayload<T> = {
        key, area,
        state: value,
        origin: globalThis.location?.href
      };
      return writeToExternalStorageAction(payload);
    },

    async getItem(key: string): Promise<T> {
      return readFromExternalStorageAction({ area, key });
    },

    async removeItem(key: string) {
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
