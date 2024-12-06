// Persistent storage helper

import { createLogger } from "./utils/createLogger";
import { StorageAdapter, StorageHelper, StorageHelperOptions } from "./utils/storageHelper";
import { readFromExternalStorageAction, removeFromExternalStorageAction, writeToExternalStorageAction } from "./extension/actions";
import { MessageType, onMessage, StorageSyncPayload, StorageWritePayload } from "./extension";
import { StorageArea } from "./background/storage.bgc";
import { isDevelopment, isFirefox } from "./common-vars";

const logger = createLogger({ systemPrefix: "STORAGE(helper)" });

export interface ChromeStorageHelperOptions<T> extends Omit<StorageHelperOptions<T>, "storageAdapter"> {
  area?: StorageArea;
}

export function createStorage<T>(key: string, options: ChromeStorageHelperOptions<T>) {
  let {
    area = "local",
    ...storageOptions
  } = options;

  if (isFirefox()) {
    area = "local"; // area "sync" requires firefox account
  }

  const storageAdapter: StorageAdapter<T> = {
    setItem(key: string, value: T) {
      const payload: StorageWritePayload<T> = {
        key, area,
        state: value,
        origin: StorageHelper.getResourceOrigin(),
      };
      return writeToExternalStorageAction(payload);
    },

    async getItem(key: string): Promise<T> {
      return readFromExternalStorageAction({ area, key });
    },

    async removeItem(key: string) {
      return removeFromExternalStorageAction({
        area, key,
        origin: StorageHelper.getResourceOrigin(),
      });
    },
  };

  const storageHelper = new StorageHelper<T>(key, {
    ...storageOptions,
    storageAdapter,
  });

  onMessage(MessageType.STORAGE_DATA_SYNC, async (payload: StorageSyncPayload<T>) => {
    const currentOrigin = StorageHelper.getResourceOrigin();

    const { key: evtKey, origin: evtOrigin, area: evtArea, state: evtState } = payload;
    const storageKeyMatched = evtKey === storageHelper.key;
    const isSameArea = evtArea === area;
    const isDifferentOrigin = evtOrigin !== currentOrigin;

    if (storageKeyMatched && isSameArea && isDifferentOrigin) {
      logger.info("data sync", {
        eventOrigin: currentOrigin,
        payload,
      });

      if (evtState === undefined) {
        storageHelper.reset({ silent: true });
      } else {
        storageHelper.set(evtState, {
          silent: true, // don't save back to persistent storage
        });
      }
    }
  });

  return storageHelper;
}
