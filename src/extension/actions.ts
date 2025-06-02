import { isContextInvalidatedError, sendMessage, sendMessageSafe } from "./runtime";
import { getActiveTabId } from "./tabs";
import { MessageType } from "./messages";

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
