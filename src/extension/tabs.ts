// Chrome tabs's api helper
import { Message } from './message'

function sendMessage(tabId: number, message: Message) {
  chrome.tabs.sendMessage(tabId, message);
}

function broadcastMessage(message: Message) {
  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => sendMessage(tab.id, message));
  });
}

function open(url: string, active = true): Promise<chrome.tabs.Tab> {
  return new Promise((resolve) => {
    chrome.tabs.create({ url, active }, resolve);
  });
}

function getActive(): Promise<chrome.tabs.Tab> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true }, function (tabs) {
      resolve(tabs[0]);
    });
  });
}

export const tabs = {
  broadcastMessage,
  sendMessage,
  open,
  getActive,
};