// Chrome tabs's api helper
import { Message } from './messages'

export function sendTabMessage<T>(tabId: number, message: Message<T>) {
  chrome.tabs.sendMessage(tabId, message);
}

export function createTab(url: string, active = true): Promise<chrome.tabs.Tab> {
  return new Promise((resolve) => {
    chrome.tabs.create({ url, active }, resolve);
  });
}

export function getActiveTab(): Promise<chrome.tabs.Tab> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true }, function (tabs) {
      resolve(tabs[0]);
    });
  });
}
