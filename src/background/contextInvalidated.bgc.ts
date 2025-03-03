//-- Handling chrome.api extension error "context invalidated"
// Happens on extension new version updates, content-script stops working (not re-connected automatically)

import { contentScriptEntry } from "../common-vars";
import { getContentScriptInjectableTabs } from "../extension";

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
