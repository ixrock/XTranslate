// Chrome extension's runtime api
import { Message } from './message'
import { tabs } from './tabs'

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

export function openOptionsPage(hash?: string) {
  tabs.open(getOptionsPageUrl(hash));
}

export function getBgcPage(): Promise<Window> {
  return new Promise((resolve) => {
    chrome.runtime.getBackgroundPage(resolve)
  });
}

export function sendMessage(message: Message) {
  chrome.runtime.sendMessage(message)
}

export function broadcastMessage(message: Message) {
  sendMessage(message);
  tabs.broadcastMessage(message);
}

export function connect(info?: chrome.runtime.ConnectInfo) {
  return chrome.runtime.connect(info);
}

export function onConnect(callback: (port: chrome.runtime.Port) => void) {
  var listener = function (port) {
    if (getId() !== port.sender.id) return;
    callback(port);
  };
  chrome.runtime.onConnect.addListener(listener);
  return () => chrome.runtime.onConnect.removeListener(listener);
}

export function onMessage(callback: (message: Message, sender: chrome.runtime.MessageSender, sendResponse) => void) {
  var listener = function (message, sender: chrome.runtime.MessageSender, sendResponse) {
    if (getId() !== sender.id) return;
    callback(message, sender, sendResponse);
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}