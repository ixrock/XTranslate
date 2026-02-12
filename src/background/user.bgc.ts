import { MessageType, onMessage } from "../extension";
import { createLogger } from "@/utils/createLogger";
import { userStorage, userStore } from "@/pro/user.storage";

const logger = createLogger({ systemPrefix: '[USER]' });

export function listenUserSubscriptionUpdateRequest() {
  return onMessage(MessageType.USER_DATA_UPDATE_REQUEST, refreshUserData);
}

export async function refreshUserData() {
  await userStorage.load();

  const lastUpDate = new Date(userStorage.get().lastUpdatedTime).toString();

  if (userStore.isStale) {
    logger.info(`LOADING USER DATA, last time: ${lastUpDate}`);
    await userStore.refreshFromServer();
  }
}
