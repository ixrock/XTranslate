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

export function getStyleUrl() {
  var manifest = getManifest();
  var filePath = manifest.content_scripts.map(script => script.css)[0][0];
  return getURL(filePath);
}

export function getOptionsPageUrl(page?: string) {
  var optionsPage = getURL(getManifest().options_page);
  if (page) optionsPage += `?page=` + page;
  return optionsPage;
}

export function getBgcPage(): Promise<typeof window> {
  return new Promise((resolve, reject) => {
    chrome.runtime.getBackgroundPage(bgcWin => {
      var error = chrome.runtime.lastError;
      if (error) reject(error)
      else resolve(bgcWin as any)
    })
  })
}

export function sendMessage<P>(message: Message<P>) {
  chrome.runtime.sendMessage(message)
}

type OnMessageCallback<P = any> = (message: Message<P>, sender: chrome.runtime.MessageSender, sendResponse: any) => void;

export function onMessage<P = any>(callback: OnMessageCallback<P>) {
  var listener: OnMessageCallback = (message, sender, sendResponse) => {
    if (getId() !== sender.id) return;
    callback(message, sender, sendResponse);
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}
