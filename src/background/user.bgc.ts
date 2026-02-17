import { createIsomorphicAction, MessageType } from "../extension";
import { userStore } from "@/pro";

export const refreshUserSubscriptionAction = createIsomorphicAction({
  messageType: MessageType.USER_SUBSCRIPTION_UPDATE_REQ,
  handler() {
    return userStore.refreshSubscriptionCheck();
  }
});
