//-- Handling persistent data storage for extension
// Currently used `chrome.storage.*` APIs

import { disposer } from "../utils/disposer";
import { MessageType, onMessage, StorageDeletePayload, StorageReadPayload, StorageWritePayload, syncExternalStorageUpdate } from '../extension'
import { createLogger } from "../utils/createLogger";

const logger = createLogger({ systemPrefix: "STORAGE(BGC)" });

export type StorageArea = chrome.storage.AreaName;

export function listenStorageActions() {
  return disposer(
    onMessage(MessageType.STORAGE_DATA_READ, readFromExternalStorage),
    onMessage(MessageType.STORAGE_DATA_WRITE, writeToExternalStorage),
    onMessage(MessageType.STORAGE_DATA_REMOVE, removeFromExternalStorage),
  );
}

function getExtensionStorageApi(area: StorageArea = "local") {
  return chrome.storage[area];
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

  // send sync update to browser tabs and opened extension windows (if any)
  if (syncUpdate) {
    void syncExternalStorageUpdate(payload);
  }
}

export async function removeFromExternalStorage(payload: StorageDeletePayload, syncUpdate = true): Promise<void> {
  const { key, area } = payload;
  const storageApi = getExtensionStorageApi(area);

  logger.info(`removing item "${key}"(area: ${area}) from storage`);
  await storageApi.remove(key);

  if (syncUpdate) {
    void syncExternalStorageUpdate({
      ...payload,
      state: undefined,
    });
  }
}
