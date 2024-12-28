//-- Handling chrome.api extension error "context invalidated"
// Happens on extension new version updates, content-script stops working (not re-connected automatically)

import { getContentScriptInjectableTabs, MessageType, onMessage } from "../extension";
import { disposer } from "../utils";
import { contentScriptEntry } from "../common-vars";

export function handleContextInvalidatedError() {
  return disposer(
    onMessage(MessageType.EXTENSION_CONTEXT_INVALIDATED, onContextInvalidated)
  );
}

export async function onContextInvalidated() {
  const tabsForUpdateScript = await getContentScriptInjectableTabs();

  await Promise.allSettled(
    tabsForUpdateScript.map((tab) => {
      return chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [`${contentScriptEntry}.js`],
      });
    })
  );
}
