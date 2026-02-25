import { createIsomorphicAction, getActiveTabId, MessageType, sendMessageWithRetry } from "../extension";

export const getSelectedTextAction = createIsomorphicAction<[], string>({
  messageType: MessageType.GET_SELECTED_TEXT,

  async handler() {
    try {
      return await sendMessageWithRetry<{}, string>({
        type: MessageType.GET_SELECTED_TEXT,
        tabId: await getActiveTabId()
      });
    } catch (err) {
      return "";
    }
  },
});
