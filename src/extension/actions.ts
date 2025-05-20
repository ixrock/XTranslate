import { isSystemPage } from "../common-vars";
import { getActiveTab, sendMessageToTab } from "./tabs";
import { sendMessage } from "./runtime";
import { MessageType, TranslatePagePayload } from "./messages";

export async function getSelectedText(): Promise<string> {
  const activeTab = await getActiveTab();

  // fix: Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist
  if (!activeTab.url || isSystemPage(activeTab.url)) {
    return "";
  }

  return sendMessage<void, string>({
    type: MessageType.GET_SELECTED_TEXT,
    tabId: activeTab.id,
  });
}

export async function translateActivePage() {
  const activeTab = await getActiveTab();

  void sendMessageToTab<TranslatePagePayload>(activeTab.id, {
    type: MessageType.TRANSLATE_FULL_PAGE,
    payload: {
      tabId: activeTab.id,
      pageUrl: activeTab.url,
    }
  });
}
