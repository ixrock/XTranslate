// Chrome tabs apis
import type { Message } from './messages'

export function createTab(url: string, active = true): Promise<chrome.tabs.Tab> {
  return chrome.tabs.create({ url, active });
}

export function sendMessageToTab<Request, Response = unknown>(
  tabId: number,
  message: Message<Request>,
  responseCallback?: (res: Response) => void,
) {
  chrome.tabs.sendMessage(tabId, message, responseCallback);
}

export function sendMessageToAllTabs<P>(message: Message<P>) {
  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => sendMessageToTab(tab.id, message));
  });
}

export function getActiveTab(): Promise<chrome.tabs.Tab> {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true }, function (tabs) {
      resolve(tabs[0]);
    });
  });
}
