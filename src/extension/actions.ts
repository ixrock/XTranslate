import { isBackgroundWorker, isContextInvalidatedError, onMessage, sendMessage, sendMessageSafe } from "./runtime";
import { MessageType } from "./messages";
import { getActiveTabId } from "./tabs";

export interface IsomorphicActionParams<Payload, Result> {
  messageType: MessageType;
  handler: (data?: Payload) => Promise<Result>;
  processResult?: (response: Result, request: Payload) => Promise<Result>;
  autoBindListener?: boolean; // bind handler to `chrome.runtime.onMessage` for provided  `message.type` (default: true)
}

export function createIsomorphicAction<Payload, Result>(params: IsomorphicActionParams<Payload, Result>) {
  const {
    messageType, handler,
    autoBindListener = true,
    processResult,
  } = params;

  if (autoBindListener && isBackgroundWorker()) {
    onMessage(messageType, handler);
  }

  return async (payload: Payload, tabId?: number): Promise<Result> => {
    let response: Result;

    if (isBackgroundWorker()) {
      response = await handler(payload);
    } else {
      response = await sendMessage<Payload, Result>({
        type: messageType,
        tabId,
        payload,
      });
    }

    if (processResult) {
      return processResult(response, payload);
    }
    return response;
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

export async function isRuntimeContextInvalidated(): Promise<boolean> {
  try {
    await sendMessage({ type: MessageType.RUNTIME_ERROR_CONTEXT_INVALIDATED });
    return false; // if we reach this point, the context is valid
  } catch (err) {
    return isContextInvalidatedError(err);
  }
}
