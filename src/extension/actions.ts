import { getActiveTab } from "./tabs";
import { isContextInvalidatedError, sendMessage, sendMessageSafe } from "./runtime";
import { MessageType, TranslatePagePayload } from "./messages";

export async function getSelectedText(): Promise<string> {
  const activeTab = await getActiveTab();

  return sendMessageSafe<void, string>({
    type: MessageType.GET_SELECTED_TEXT,
    tabId: activeTab.id,
  });
}

export async function translateActivePage() {
  const activeTab = await getActiveTab();

  return sendMessageSafe<TranslatePagePayload, void>({
    type: MessageType.TRANSLATE_FULL_PAGE,
    tabId: activeTab.id,
    payload: {
      tabId: activeTab.id,
      pageUrl: activeTab.url,
    }
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
