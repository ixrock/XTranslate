//-- Handling persistent data storage for extension
// Currently used `chrome.storage.*` APIs

import { Message, MessageType, StorageDeletePayload, StorageReadPayload, StorageSyncPayload, StorageWritePayload } from '../extension/messages'
import { broadcastMessage, createIsomorphicAction } from "../extension";

export type StorageKey = string;
export type StorageArea = chrome.storage.AreaName;

export const writeToExternalStorageAction = createIsomorphicAction({
  messageType: MessageType.STORAGE_DATA_WRITE,
  handler: writeToExternalStorage,
});

export const readFromExternalStorageAction = createIsomorphicAction({
  messageType: MessageType.STORAGE_DATA_READ,
  handler: readFromExternalStorage,
});

export const removeFromExternalStorageAction = createIsomorphicAction({
  messageType: MessageType.STORAGE_DATA_REMOVE,
  handler: removeFromExternalStorage,
});

export function getStorageApi(area: StorageArea = "local") {
  return chrome.storage[area];
}

export async function readFromExternalStorage({ key, area }: StorageReadPayload): Promise<any> {
  const storageApi = getStorageApi(area);

  const items = await storageApi.get(key) ?? {};
  return items[key];
}

export async function writeToExternalStorage<T>(payload: StorageWritePayload, syncUpdate = true): Promise<void> {
  const { key, area, state } = payload;
  const storageApi = getStorageApi(area);

  await storageApi.set({ [key]: state });

  // send sync update to browser tabs and opened extension windows (if any)
  if (syncUpdate) {
    void syncExternalStorageUpdate(payload);
  }
}

export async function removeFromExternalStorage(payload: StorageDeletePayload, syncUpdate = true): Promise<void> {
  const { key, area } = payload;
  const storageApi = getStorageApi(area);

  await storageApi.remove(key);

  if (syncUpdate) {
    void syncExternalStorageUpdate({
      ...payload,
      state: undefined
    });
  }
}

export function syncExternalStorageUpdate<T>(payload: StorageSyncPayload<T>) {
  const msg: Message<StorageSyncPayload<T>> = {
    type: MessageType.STORAGE_DATA_SYNC,
    payload,
  };

  return broadcastMessage(msg);
}

export function listenExternalStorageChanges(area: StorageArea, callback: (changes: Record<StorageKey, unknown>) => void) {
  const storageApi = getStorageApi(area);

  const handleChange = (changes: Record<StorageKey, chrome.storage.StorageChange>) => {
    const newValues = Object.entries(changes).reduce((result, [key, { newValue }]) => {
      result[key] = newValue;
      return result;
    }, {} as Record<StorageKey, unknown>);

    callback(newValues);
  };

  storageApi.onChanged.addListener(handleChange);
  return () => storageApi.onChanged.removeListener(handleChange);
}
