import {
  createIsomorphicAction,
  getActiveTabId,
  isRuntimeConnectionFailedError,
  MessageType,
  sendMessage,
  sendMessageSafe,
} from "../extension";
import { tryInjectContentScript } from "./scripting.bgc";

export interface TranslateActivePagePayload {
  tabId?: number;
}

async function translateActivePageHandler({ tabId }: TranslateActivePagePayload = {}) {
  const targetTabId = tabId ?? await getActiveTabId();

  try {
    return await sendMessage<void, void>({
      type: MessageType.TRANSLATE_FULL_PAGE,
      tabId: targetTabId,
    });
  } catch (err) {
    if (!isRuntimeConnectionFailedError(err)) throw err;
  }

  await tryInjectContentScript({ tabId: targetTabId });

  return sendMessageSafe<void, void>({
    type: MessageType.TRANSLATE_FULL_PAGE,
    tabId: targetTabId,
  });
}

export const translateActivePageAction = createIsomorphicAction({
  messageType: MessageType.TRANSLATE_ACTIVE_PAGE,
  handler: translateActivePageHandler,
});

export function translateActivePageContextMenuAction(_: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): Promise<void> {
  return translateActivePageAction({ tabId: tab?.id });
}
