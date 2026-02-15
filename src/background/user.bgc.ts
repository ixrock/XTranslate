import { MessageType, onMessage } from "../extension";
import { userStore } from "@/pro";

export function listenUserSubscriptionUpdateRequest() {
  return onMessage(MessageType.USER_DATA_UPDATE_REQUEST, async () => {
     await userStore.refreshFromContentScript();
  });
}
