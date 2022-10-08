// Chrome tabs apis
import type { Message } from './messages'

export function createTab(url: string, active = true): Promise<chrome.tabs.Tab> {
  return chrome.tabs.create({ url, active });
}

export function sendMessageToTab<Request, Response = unknown>(tabId: number, message: Message<Request>): Promise<Response> {
  return chrome.tabs.sendMessage(tabId, message);
}

export async function sendMessageToAllTabs<P>(message: Message<P>) {
  const tabs = await chrome.tabs.query({});

  return Promise.allSettled(
    tabs.map(tab => sendMessageToTab(tab.id, message))
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
