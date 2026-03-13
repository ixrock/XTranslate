import { createIsomorphicAction, MessageType } from "../extension";
import { userStore } from "@/pro";

export const userSubscriptionRefreshAction = createIsomorphicAction({
  messageType: MessageType.USER_SUBSCRIPTION_REFRESH,

  async handler({ force = false } = {}) {
    await userStore.whenReady;

    if (userStore.cacheResetRequired || force) {
      return await userStore.loadSubscriptionSafe();
    }
  }
});
