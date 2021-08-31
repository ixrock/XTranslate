import { checkErrors, isExtensionPage, onMessageType, runtimeLogger } from "./extension/runtime";
import { StorageAdapter, StorageHelper, StorageMigrationCallback } from "./utils/storageHelper";
import { MessageType, StoragePayload } from "./extension";
import { broadcastStorage } from "./extension/actions";

export type StorageArea = "local" | "sync";

export interface CreateStorageOptions<T> {
  autoLoad?: boolean; // preload data from storage immediately, default: true
  syncToRemote?: boolean; // send local data changes to remote storage, default: true
  syncFromRemote?: boolean; // merge updates from remote storage, default: true
  area?: StorageArea; // corresponding chrome.storage[area], default: "local"
  migrations?: StorageMigrationCallback<T>[];
  onRemoteUpdate?(data: T): void;
}

const migrations: StorageMigrationCallback<any>[] = [
  function migration(data: any) {
    if (typeof data?.version === "number" && data.data) {
      return data.data;
    }
    return data;
  }
];

export function createStorage<T>(key: string, defaultValue?: T, init: CreateStorageOptions<T> = {}) {
  const {
    autoLoad = true,
    syncFromRemote = true,
    syncToRemote = true,
    area = "local",
    onRemoteUpdate,
  } = init;

  const storageHelper = new StorageHelper<T>(key, {
    autoInit: autoLoad,
    autoSave: syncToRemote,
    defaultValue: defaultValue,
    storage: createStorageAdapter<T>(area),
    migrations: migrations.concat(init.migrations ?? []),
  });

  // subscribe for updates via chrome.runtime messaging
  onMessageType<StoragePayload>(MessageType.STORAGE_UPDATE, ({ payload }) => {
    const isCurrentStorage = area === payload.storageArea && key === payload.key;
    if (!isCurrentStorage || !storageHelper.initialized) return;
    if (storageHelper.isEqual(payload.state)) return;

    runtimeLogger.info(`storage sync for key="${payload.key}"`, payload.state);
    if (syncFromRemote) storageHelper.set(payload.state);
    onRemoteUpdate?.(payload.state);
  });

  return storageHelper;
}

export function createStorageAdapter<T>(storageArea: StorageArea): StorageAdapter<T> {
  const storage = chrome.storage[storageArea];
  return {
    async setItem(key: string, value: T) {
      return new Promise(resolve => {
        storage.set({ [key]: value }, () => resolve(checkErrors()))
      })
    },
    async getItem(key: string): Promise<T> {
      return new Promise(resolve => {
        storage.get(key, items => resolve(checkErrors(items[key])))
      });
    },
    async removeItem(key: string) {
      return new Promise(resolve => {
        storage.remove(key, () => resolve(checkErrors()));
      })
    },
    onChange({ key, value: state }) {
      if (!isExtensionPage()) return; // skip in content-page scripts

      broadcastStorage<T>({
        key, state, storageArea
      });
    },
  };
}

export function createSyncStorage<T>(key: string, defaultValue?: T, options: Omit<CreateStorageOptions<T>, "area"> = {}) {
  return createStorage<T>(key, defaultValue, {
    area: "sync",
    ...options,
  });
}
