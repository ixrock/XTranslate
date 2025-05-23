// Persistent storage helper

import { createLogger } from "./utils/createLogger";
import { StorageAdapter, StorageHelper, StorageHelperOptions } from "./utils/storageHelper";
import { isBackgroundWorker, onMessage } from "./extension/runtime";
import { MessageType, StorageSyncPayload, StorageWritePayload } from "./extension/messages";
import { listenExternalStorageChanges, readFromExternalStorageAction, removeFromExternalStorageAction, StorageArea, writeToExternalStorageAction } from "./background/storage.bgc";

const logger = createLogger({ systemPrefix: "STORAGE(helper)" });

export interface ChromeStorageHelperOptions<T> extends Omit<StorageHelperOptions<T>, "storageAdapter"> {
  area?: StorageArea;
}

export function createStorage<T>(key: string, options: ChromeStorageHelperOptions<T> = {}) {
  const {
    area = "local",
    ...storageOptions
  } = options;

  const storageAdapter: StorageAdapter<T> = {
    async setItem(key: string, state: T) {
      const payload: StorageWritePayload<T> = { key, area, state };
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

  // sync storage updates for background instances
  if (isBackgroundWorker()) {
    listenExternalStorageChanges(area, (changes) => {
      if (key in changes) {
        logger.info("BACKGROUND SYNC", changes[key]);
        storageHelper.sync(changes[key] as T);
      }
    });
  }

  // sync storage updates for options-page (app) and content-script pages
  onMessage(MessageType.STORAGE_DATA_SYNC, async (payload: StorageSyncPayload<T>) => {
    const { key: evtKey, area: evtArea, state } = payload;
    const storageKeyMatched = evtKey === key;
    const isSameArea = evtArea === area;

    if (storageKeyMatched && isSameArea) {
      logger.info("PAGE SYNC", payload);
      storageHelper.sync(state);
    }
  });

  return storageHelper;
}
