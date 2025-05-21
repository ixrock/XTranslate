// Injectable script actions

import { getActiveTab, InjectContentScriptPayload, isBackgroundWorker, MessageType, onMessage, sendMessage } from "../extension";
import { contentScriptEntry } from "../common-vars";
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
    tabId ??= (await getActiveTab()).id;

    logger.info(`INJECTING CONTENT-SCRIPT, tabId: ${tabId}`);

    return chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: [`${contentScriptEntry}.js`],
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
