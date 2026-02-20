import { createIsomorphicAction, MessageType } from "../extension";
import { userStore } from "@/pro";

export const refreshUserSubscriptionAction = createIsomorphicAction({
  messageType: MessageType.PRO_USER_SUB_UPDATE_REQ,
  handler() {
    return userStore.refreshSubscriptionCheck();
  }
});
