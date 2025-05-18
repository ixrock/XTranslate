import { isSystemPage } from "../common-vars";
import { getActiveTab } from "./tabs";
import { sendMessage } from "./runtime";
import { MessageType } from "./messages";

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
