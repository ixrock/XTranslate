import { getActiveTab } from "./tabs";
import { sendMessage } from "./runtime";
import { MessageType, TranslatePagePayload } from "./messages";

export async function getSelectedText(): Promise<string> {
  const activeTab = await getActiveTab();

  return sendMessage<void, string>({
    type: MessageType.GET_SELECTED_TEXT,
    tabId: activeTab.id,
  });
}

export async function translateActivePage<Payload>(): Promise<Payload & TranslatePagePayload> {
  const activeTab = await getActiveTab();

  return sendMessage<TranslatePagePayload>({
    tabId: activeTab.id,
    type: MessageType.TRANSLATE_FULL_PAGE,
    payload: {
      tabId: activeTab.id,
      pageUrl: activeTab.url,
    }
  });
}

export async function isRuntimeContextInvalidatedAction(): Promise<boolean> {
  try {
    await sendMessage({
      type: MessageType.RUNTIME_ERROR_CONTEXT_INVALIDATED,
    });
    return false; // if we reach this point, the context is valid
  } catch (err) {
    return isContextInvalidatedError(err);
  }
}

export function isContextInvalidatedError(err: Error) {
  return String(err).includes("Extension context invalidated");
}

export function isRuntimeConnectionFailedError(err: Error) {
  return String(err).includes("Could not establish connection. Receiving end does not exist");
}
