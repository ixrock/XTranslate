import { isSystemPage } from "../common-vars";
import { getActiveTab } from "./tabs";
import { sendMessage } from "./runtime";
import { MessageType, TranslatePagePayload } from "./messages";

export async function getSelectedText(): Promise<string> {
  const activeTab = await getActiveTab();

  // avoid error "Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist"
  // happens in communication app <-> system page (e.g. `chrome://*` or `chrome-extension://*`)
  if (isSystemPage(activeTab.url)) {
    return "";
  }

  return sendMessage<void, string>({
    type: MessageType.GET_SELECTED_TEXT,
    tabId: activeTab.id,
  });
}

export async function translateActivePage<Payload>(): Promise<Payload | false> {
  const activeTab = await getActiveTab();

  if (isSystemPage(activeTab.url)) {
    return false;
  }

  return sendMessage<TranslatePagePayload>({
    tabId: activeTab.id,
    type: MessageType.TRANSLATE_FULL_PAGE,
    payload: {
      tabId: activeTab.id,
      pageUrl: activeTab.url,
    }
  });
}

export async function runtimeCheckContextInvalidated() {
  try {
    await sendMessage({
      type: MessageType.RUNTIME_CHECK_CONTEXT_INVALIDATED,
    });

    return false;
  } catch (err) {
    return String(err).includes("Extension context invalidated");
  }
}