// Persistent storage helper

import { createLogger } from "./utils/createLogger";
import { StorageAdapter, StorageHelper, StorageHelperOptions } from "./utils/storageHelper";
import { isBackgroundWorker, onMessage } from "./extension/runtime";
import { MessageType, StorageSyncPayload, StorageWritePayload } from "./extension/messages";
import { listenExternalStorageChanges, readFromExternalStorageAction, removeFromExternalStorageAction, StorageArea, writeToExternalStorageAction } from "./background/storage.bgc";
import { isDevelopment, isFirefox } from "./common-vars";

const logger = createLogger({ systemPrefix: "STORAGE(helper)" });

export interface ChromeStorageHelperOptions<T> extends Omit<StorageHelperOptions<T>, "storageAdapter"> {
  area?: StorageArea;
}

export function createStorage<T>(key: string, options: ChromeStorageHelperOptions<T> = {}) {
  let {
    area = "local",
    ...storageOptions
  } = options;

  if (isFirefox()) {
    area = "local"; // area "sync" requires firefox account
  }

  const storageAdapter: StorageAdapter<T> = {
    async setItem(key: string, state: T): Promise<void> {
      const payload: StorageWritePayload<T> = { key, area, state };
      return writeToExternalStorageAction(payload);
    },

    async getItem(key: string): Promise<T> {
      return readFromExternalStorageAction({ area, key });
    },

    async removeItem(key: string): Promise<void> {
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
        logger.info(`BACKGROUND SYNC "${key}"`, changes[key]);
        storageHelper.sync(changes[key] as T);
      }
    });
  }

  // sync storage updates for options-page (app) and content-script pages
  onMessage(MessageType.STORAGE_DATA_SYNC, async (payload: StorageSyncPayload<T>) => {
    const msgOrigin = StorageHelper.getResourceOrigin();
    const { key: evtKey, area: evtArea, state } = payload;
    const storageKeyMatched = evtKey === key;
    const isSameArea = evtArea === area;

    if (storageKeyMatched && isSameArea) {
      logger.info(`PAGE SYNC "${key}" at ${msgOrigin}`, payload);
      storageHelper.sync(state);
    }
  });

  return storageHelper;
}
