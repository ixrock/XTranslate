import { createIsomorphicAction, getActiveTabId, MessageType, sendMessageWithRetry, TranslateFullPagePayload } from "../extension";

export const translateActivePageAction = createIsomorphicAction({
  messageType: MessageType.TRANSLATE_FULL_PAGE,

  async handler(payload: TranslateFullPagePayload = {}) {
    return await sendMessageWithRetry({
      type: MessageType.TRANSLATE_FULL_PAGE,
      tabId: await getActiveTabId(),
      payload,
    });
  },
});
