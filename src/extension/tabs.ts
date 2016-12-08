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

export const tabs = {
  broadcastMessage,
  sendMessage
};