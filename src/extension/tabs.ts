// Chrome tabs apis
import type { Message } from './messages'
import { sendMessage } from "./runtime";

export function createTab(url: string, active = true): Promise<chrome.tabs.Tab> {
  return chrome.tabs.create({ url, active });
}

export function sendMessageToTab<Request, Response = unknown>(tabId: number, message: Message<Request>): Promise<Response> {
  return chrome.tabs.sendMessage(tabId, message);
}

export async function sendMessageToAllTabs<P>(message: Message<P>, filter?: (tabUrl: string) => boolean) {
  let tabs = await chrome.tabs.query({});

  return Promise.allSettled(
    tabs
      .filter(filter ? tab => filter(tab.url) : () => true)
      .map(tab => sendMessageToTab(tab.id, message))
  );
}

// Works differently than `chrome.tabs.getCurrent()`
// Only "activeTab" permission is enabled in manifest.json
// e.g. show translation in extension's window when some text selected at webpage
export function getActiveTab(): Promise<chrome.tabs.Tab> {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true }, function (tabs) {
      resolve(tabs[0]);
    });
  });
}

/**
 * Broadcast message to all window tabs (context pages) and extension windows (options page)
 */
export async function broadcastMessage<T>(msg: Message<T>) {
  try {
    await sendMessage<T>(msg);
  } catch (err) {
    if (String(err).includes("Could not establish connection. Receiving end does not exist.")) {
      // do nothing: this error might happen when options page extension window is not opened
    } else {
      throw err;
    }
  }

  return sendMessageToAllTabs<T>(msg);
}
