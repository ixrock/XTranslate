// Injectable script actions

import { getActiveTabId, InjectContentScriptPayload, isBackgroundWorker, MessageType, onMessage, sendMessage, waitTabReadiness } from "../extension";
import { contentScriptInjectable } from "../common-vars";
import { disposer } from "../utils/disposer";
import { getInjectableTabs } from "../extension/tabs";
import { createLogger } from "../utils/createLogger";

const logger = createLogger({ systemPrefix: '[SCRIPTING]' });

export function listenScriptingActions() {
  return disposer(
    onMessage(MessageType.INJECT_CONTENT_SCRIPT, injectContentScript),
  );
}

export async function injectContentScript({ tabId }: InjectContentScriptPayload = {}) {
  if (isBackgroundWorker()) {
    tabId ??= await getActiveTabId();

    return injectScriptSafe(tabId, {
      target: { tabId, allFrames: true },
      files: [`${contentScriptInjectable}.js`],
    });
  }

  return sendMessage<InjectContentScriptPayload>({
    type: MessageType.INJECT_CONTENT_SCRIPT,
    payload: { tabId }
  });
}

export async function refreshContentScripts() {
  const tabs = await getInjectableTabs();

  return Promise.allSettled(tabs.map((tab) => injectContentScript({ tabId: tab.id })));
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
