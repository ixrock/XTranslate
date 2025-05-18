//-- Handling persistent data storage for extension
// Currently used `chrome.storage.*` APIs

import { disposer } from "../utils/disposer";
import { Message, MessageType, StorageDeletePayload, StorageReadPayload, StorageSyncPayload, StorageWritePayload } from '../extension/messages'
import { isBackgroundWorker, onMessage, sendMessage, } from '../extension/runtime'
import { broadcastMessage } from '../extension/tabs'

export type StorageArea = chrome.storage.AreaName;

export function listenStorageActions() {
  return disposer(
    onMessage(MessageType.STORAGE_DATA_READ, readFromExternalStorage),
    onMessage(MessageType.STORAGE_DATA_WRITE, writeToExternalStorage),
    onMessage(MessageType.STORAGE_DATA_REMOVE, removeFromExternalStorage),
  );
}

export function getStorageApi(area: StorageArea = "local") {
  return chrome.storage[area];
}

export async function readFromExternalStorage<T>({ key, area }: StorageReadPayload): Promise<T> {
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
      state: undefined,
    });
  }
}

export function listenExternalStorageChanges(area: StorageArea, callback: (changes: Record<string/*key*/, unknown>) => void) {
  const storageApi = getStorageApi(area);

  const handleChange = (changes: Record<string/*key*/, chrome.storage.StorageChange>) => {
    const newValues = Object.entries(changes).reduce((result, [key, { newValue }]) => {
      result[key] = newValue;
      return result;
    }, {} as Record<string, unknown>);

    callback(newValues);
  };

  storageApi.onChanged.addListener(handleChange);
  return () => storageApi.onChanged.removeListener(handleChange);
}

export async function writeToExternalStorageAction(payload: StorageWritePayload) {
  if (isBackgroundWorker()) {
    return writeToExternalStorage(payload);
  }

  return sendMessage<StorageWritePayload>({
    type: MessageType.STORAGE_DATA_WRITE,
    payload,
  });
}

export async function readFromExternalStorageAction(payload: StorageReadPayload) {
  if (isBackgroundWorker()) {
    return readFromExternalStorage(payload);
  }

  return sendMessage<StorageReadPayload>({
    type: MessageType.STORAGE_DATA_READ,
    payload,
  });
}

export async function removeFromExternalStorageAction(payload: StorageDeletePayload) {
  if (isBackgroundWorker()) {
    return removeFromExternalStorage(payload);
  }

  return sendMessage<StorageDeletePayload>({
    type: MessageType.STORAGE_DATA_REMOVE,
    payload,
  });
}

export function syncExternalStorageUpdate<T>(payload: StorageSyncPayload<T>) {
  const msg: Message<StorageSyncPayload<T>> = {
    type: MessageType.STORAGE_DATA_SYNC,
    payload,
  };

  return broadcastMessage(msg);
}
