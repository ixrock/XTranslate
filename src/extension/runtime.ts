// Chrome extension's runtime api helpers
import { Message } from './messages'

export function getId() {
  return chrome.runtime.id;
}

export function getManifest() {
  return chrome.runtime.getManifest();
}

export function getURL(path: string) {
  return chrome.runtime.getURL(path);
}

export function getOptionsPageUrl(hash = location.hash) {
  if (hash && !hash.startsWith('#')) hash = "#" + hash;
  return getURL(getManifest().options_page) + hash;
}

export function sendMessage<T>(message: Message<T>) {
  chrome.runtime.sendMessage(message)
}

type OnMessageCallback = (message: Message, sender: chrome.runtime.MessageSender, sendResponse: (data?: any) => void) => void;

export function onMessage(callback: OnMessageCallback) {
  var listener: OnMessageCallback = (message, sender, sendResponse) => {
    if (getId() !== sender.id) return;
    callback(message, sender, sendResponse);
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}
