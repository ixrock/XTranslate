// Isomorphic persistent storage layer (helper)
// The utility can be used in any environment (background, content-page, etc.)
// Sync data-state updates to extension-runtime and browser tabs via service-worker aka "background-script"

import { createLogger } from "@/utils/createLogger";
import { disposer } from "@/utils/disposer";
import { StorageAdapter, StorageHelper, StorageHelperOptions } from "@/utils/storageHelper";
import { isBackgroundWorker, onMessage } from "@/extension/runtime";
import { MessageType, StorageSyncPayload } from "@/extension/messages";
import { listenExternalStorageChanges, readFromExternalStorageAction, removeFromExternalStorageAction, StorageArea, writeToExternalStorageAction } from "@/background/storage.bgc";

const logger = createLogger({ systemPrefix: "STORAGE(helper)" });

export interface ChromeStorageHelperOptions<T> extends Omit<StorageHelperOptions<T>, "storageAdapter"> {
  area?: StorageArea;
}

export function createStorage<T>(key: string, options: ChromeStorageHelperOptions<T> = {}) {
  const {
    area = "local",
    ...storageOptions
  } = options;
  const onStorageDestroy = disposer();
  const resourceId = `${StorageHelper.getResourceOrigin() ?? "unknown"}:${Math.random().toString(36).slice(2)}`;

  const storageAdapter: StorageAdapter<T> = {
    async setItem(key: string, state: T): Promise<void> {
      return writeToExternalStorageAction<T>({ key, area, state, resourceId });
    },

    async getItem(key: string): Promise<any> {
      return readFromExternalStorageAction({ area, key });
    },

    async removeItem(key: string): Promise<void> {
      return removeFromExternalStorageAction({ area, key, resourceId });
    },
  };

  const storageHelper = new StorageHelper<T>(key, {
    ...storageOptions,
    storageAdapter,
    onUnload: onStorageDestroy,
  });

  // sync storage updates for background instances
  if (isBackgroundWorker()) {
    const stopSyncFromStorageApi = listenExternalStorageChanges(area, (changes) => {
      if (key in changes) {
        logger.info(`BACKGROUND SYNC "${key}"`, changes[key]);
        storageHelper.sync(changes[key] as T);
      }
    });
    onStorageDestroy.push(stopSyncFromStorageApi);
  }

  // sync storage updates for options-page (app) and content-script pages
  const stopSyncFromBackground = onMessage(MessageType.STORAGE_DATA_SYNC, async (payload: StorageSyncPayload<T>) => {
    const msgOrigin = StorageHelper.getResourceOrigin();
    const { key: evtKey, area: evtArea, state, resourceId: evtResourceId } = payload;
    const storageKeyMatched = evtKey === key;
    const isSameArea = evtArea === area;
    const isOwnSyncEvent = evtResourceId === resourceId;

    if (storageKeyMatched && isSameArea && !isOwnSyncEvent) {
      logger.info(`PAGE SYNC "${key}" at ${msgOrigin}`, payload);
      storageHelper.sync(state);
    }
  });

  onStorageDestroy.push(stopSyncFromBackground);

  return storageHelper;
}
