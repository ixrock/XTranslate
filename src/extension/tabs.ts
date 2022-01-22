// Chrome tabs apis
import { Message } from './messages'

export function createTab(url: string, active = true): Promise<chrome.tabs.Tab> {
  return chrome.tabs.create({ url, active });
}

export function sendMessageToTab<T>(tabId: number, message: Message<T>) {
  chrome.tabs.sendMessage(tabId, message);
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
