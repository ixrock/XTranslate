// Chrome extension's runtime api helpers
import { Message } from './message'

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

export function sendMessage(message: Message) {
  chrome.runtime.sendMessage(message)
}

export function onMessage(callback: (message: Message, sender: chrome.runtime.MessageSender, sendResponse) => void) {
  var listener = function (message, sender: chrome.runtime.MessageSender, sendResponse) {
    if (getId() !== sender.id) return;
    callback(message, sender, sendResponse);
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}