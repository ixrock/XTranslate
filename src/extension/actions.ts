import { isBackgroundWorker, onMessage, sendMessage, sendMessageSafe, openOptionsPage } from "./runtime";
import { MessageType } from "./messages";
import { getActiveTabId } from "./tabs";

export interface IsomorphicActionParams<Payload extends any[], Result> {
  messageType: MessageType;
  handler: (...data: Payload) => Promise<Result>;
  autoBindListener?: boolean; // bind handler to `chrome.runtime.onMessage` for provided  `message.type` (default: true)
}

export function createIsomorphicAction<Payload extends any[], Result>(params: IsomorphicActionParams<Payload, Result>) {
  const {
    messageType, handler,
    autoBindListener = true,
  } = params;

  if (autoBindListener && isBackgroundWorker()) {
    onMessage(messageType, handler);
  }

  return async (...payload: Payload): Promise<Result> => {
    if (isBackgroundWorker()) {
      return handler(...payload);
    }
    return sendMessage<Payload, Result>({
      type: messageType,
      payload,
    });
  };
}

export async function getSelectedText(): Promise<string> {
  return sendMessageSafe<void, string>({
    type: MessageType.GET_SELECTED_TEXT,
    tabId: await getActiveTabId(),
  });
}

export async function translateActivePage() {
  return sendMessageSafe({
    type: MessageType.TRANSLATE_FULL_PAGE,
    tabId: await getActiveTabId(),
  });
}

export const openOptionsPageAction = createIsomorphicAction({
  messageType: MessageType.OPEN_OPTIONS_PAGE,
  handler: openOptionsPage,
});
