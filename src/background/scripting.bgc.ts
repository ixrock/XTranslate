// Injectable script actions

import { createIsomorphicAction, getActiveTabId, InjectContentScriptPayload, MessageType, waitTabReadiness } from "../extension";
import { contentScriptInjectable } from "../config";
import { getInjectableTabs } from "../extension/tabs";
import { createLogger } from "../utils/createLogger";

const logger = createLogger({ systemPrefix: '[SCRIPTING]' });

export const injectContentScriptAction = createIsomorphicAction({
  messageType: MessageType.INJECT_CONTENT_SCRIPT,
  handler: injectContentScript,
})

export async function injectContentScript({ tabId }: InjectContentScriptPayload = {}) {
  tabId ??= await getActiveTabId();

  return injectScriptSafe(tabId, {
    target: { tabId, allFrames: true },
    files: [`${contentScriptInjectable}.js`],
  });
}

export async function refreshContentScripts() {
  const tabs = await getInjectableTabs();

  return Promise.allSettled(
    tabs.map((tab) => injectContentScript({ tabId: tab.id }))
  );
}

export async function injectScriptSafe<Args extends any[], Result>(
  tabId: number,
  params: chrome.scripting.ScriptInjection<Args, Result>
) {
  const isInjectable = await isInjectableTab(tabId);

  if (!isInjectable) {
    await waitTabReadiness(tabId);
  }

  try {
    return await chrome.scripting.executeScript(params);
  } catch (err) {
    logger.error(`Injecting script failed: ${err}`, params);
    throw err;
  }
}

export async function isInjectableTab(tabId: number) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => true,
      world: "ISOLATED",
    });
    return true;
  } catch (err) {
    return false;
  }
}
