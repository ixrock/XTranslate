// Chrome tabs apis
import { Message } from './messages'
import { isRuntimeConnectionFailedError, sendMessage } from "./runtime";
import { isSystemPage } from "../common-vars";

export type BrowserTab = chrome.tabs.Tab;

export function createTab(url: string, active = true): Promise<BrowserTab> {
  return chrome.tabs.create({ url, active });
}

export function sendMessageToTab<Request, Response = unknown>(tabId: number, message: Message<Request>): Promise<Response> {
  return chrome.tabs.sendMessage(tabId, message);
}

export async function sendMessageToTabs<P>(message: Message<P>, params: { filter?: (tab: BrowserTab) => boolean } = {}) {
  const tabs = await chrome.tabs.query({});

  return Promise.allSettled(
    tabs
      .filter(params.filter ?? (() => true))
      .map(tab => sendMessageToTab(tab.id, message))
  );
}

export async function getInjectableTabs(): Promise<BrowserTab[]> {
  return new Promise(resolve => {
    chrome.tabs.query({}, function (tabs) {
      resolve(tabs.filter(tab => !isSystemPage(tab.url)));
    });
  });
}

export interface BroadcastMessageParams {
  acceptFilter?: (tab: BrowserTab) => boolean;
}

/**
 * Broadcast message to all window tabs (context pages) and extension windows (options page)
 */
export async function broadcastMessage<T>(msg: Message<T>, { acceptFilter }: BroadcastMessageParams = {}) {
  try {
    await sendMessage<T>(msg); // send a message to background service-worker (if called from webpage)
  } catch (err) {
    if (!isRuntimeConnectionFailedError(err)) throw err;
  }

  return sendMessageToTabs<T>(msg, {
    filter: acceptFilter,
  });
}

export async function getActiveTab(): Promise<BrowserTab> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

export async function waitTabReadiness(tabId: number) {
  return new Promise(resolve => {
    function listener(updatedTabId: number, changes: chrome.tabs.TabChangeInfo, tab: BrowserTab) {
      const isRequestedTab = updatedTabId === tabId;
      const isComplete = changes.status === "complete"
      if (isRequestedTab && isComplete) {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(tab.id);
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  })
}
