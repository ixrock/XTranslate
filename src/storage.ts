// Chrome storages api helper

import { StorageAdapter, StorageHelper, StorageHelperOptions } from "./utils/storageHelper";
import { removeFromExternalStorageAction, readFromExternalStorageAction, syncExternalStorageUpdateAction, writeToExternalStorageAction } from "./extension/actions";
import { isFirefox } from "./common-vars";
import { isBackgroundWorker, MessageType, onMessage, StorageDeletePayload, StorageReadPayload, StorageSyncPayload, StorageWritePayload } from "./extension";
import { createLogger } from "./utils";

const logger = createLogger({ systemPrefix: "STORAGE" });

export type StorageArea = chrome.storage.AreaName;

export interface ChromeStorageHelperOptions<T> extends Omit<StorageHelperOptions<T>, "storageAdapter"> {
  area?: StorageArea;
}

export function createStorageHelper<T>(key: string, options: ChromeStorageHelperOptions<T>) {
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
    const storageKeyMatched = payload.key === storageHelper.key;
    const sameArea = payload.area === area;
    const differentWindow = payload.origin !== location?.href;

    if (storageKeyMatched && sameArea && differentWindow) {
      logger.info("data sync", {
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

export function getExtensionStorageApi(area: StorageArea = "local") {
  return isFirefox()
    ? chrome.storage.local // TODO: support "sync" for firefox (maybe it's disabled only in dev-mode)
    : chrome.storage[area];
}

export async function readFromExternalStorage<T>({ key, area }: StorageReadPayload): Promise<T> {
  const storageApi = getExtensionStorageApi(area);

  logger.info(`reading "${key}" from external storage`);

  const items = await storageApi.get(key) ?? {};
  return items[key];
}

export async function writeToExternalStorage<T>(payload: StorageWritePayload, syncUpdate = true): Promise<void> {
  const { key, area, state } = payload;
  const storageApi = getExtensionStorageApi(area);

  logger.info(`writing "${key}" data to external storage`, { key, area, state });
  await storageApi.set({ [key]: state });

  // sync data update with other browser tabs
  if (syncUpdate) {
    syncExternalStorageUpdateAction({
      origin: location?.href,
      area, state, key,
    });
  }
}

export async function removeFromExternalStorage(payload: StorageDeletePayload) {
  const { key, area } = payload;
  const storageApi = getExtensionStorageApi(area);

  logger.info(`removing item "${key}"(area: ${area}) from storage`);
  return storageApi.remove(key);
}
