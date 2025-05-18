//-- Handling chrome.api extension error "context invalidated"
// Happens on extension new version updates, content-script stops working (not re-connected automatically)

import { contentScriptEntry } from "../common-vars";
import { getContentScriptInjectableTabs } from "../extension/tabs";
import { MessageType } from "../extension/messages";
import { sendMessage } from "../extension/runtime";

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

export async function checkContextInvalidationError() {
  try {
    await sendMessage({
      type: MessageType.CONTEXT_INVALIDATION_CHECK,
    });

    return false;
  } catch (err) {
    return (
      err instanceof Error &&
      err.message.includes("Extension context invalidated")
    );
  }
}
