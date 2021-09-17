// Chrome extension's runtime api helpers
import InstalledDetails = chrome.runtime.InstalledDetails;
import { Message, MessageType } from './messages'
import { sendMessageToAllTabs, sendMessageToTab } from "./tabs";

export function getManifest(): chrome.runtime.ManifestV3 {
  return chrome.runtime.getManifest() as any;
}

export function getURL(path = ""): string {
  return chrome.runtime.getURL(path);
}

export function isBackgroundPage(): boolean {
  const serviceWorkerScript = getManifest().background.service_worker;
  return location.href.startsWith(getURL(serviceWorkerScript));
}

export function isOptionsPage(): boolean {
  const optionsHtmlPage = getManifest().options_ui.page;
  return location.href.startsWith(getURL(optionsHtmlPage));
}

export function getStyleUrl() {
  var manifest = getManifest();
  var filePath = manifest.content_scripts.map(script => script.css)[0][0];
  return getURL(filePath);
}

export function sendMessage<P>(message: Message<P>) {
  chrome.runtime.sendMessage(message)
}

export function broadcastMessage<P>(message: Message<P>) {
  sendMessage<P>(message); // send from chrome.runtime to background-process/options pages
  sendMessageToAllTabs<P>(message); // chrome.tabs -> content pages (user-script pages)
}

export type OnMessageCallback<P = any, R = any> = (
  message: Message<P>,
  sender: chrome.runtime.MessageSender,
  sendResponse: (payload: R) => void,
) => void;

export function onMessage<P = any, R = any>(callback: OnMessageCallback<P, R>) {
  var listener: OnMessageCallback = (message, sender) => {
    var sendResponse = (payload: R) => {
      var response: Message<R> = {
        id: message.id,
        type: message.type,
        payload: payload,
      }
      if (sender.tab) {
        sendMessageToTab(sender.tab.id, response);
      } else {
        sendMessage(response);
      }
    };
    callback(message, sender, sendResponse);
  };

  chrome.runtime.onMessage.addListener(listener);
  return () => {
    return chrome.runtime.onMessage.removeListener(listener);
  };
}

export function onMessageType<P = any, R = any>(type: MessageType, callback: OnMessageCallback<P, R>) {
  return onMessage((message, sender, sendResponse) => {
    if (message.type === type) {
      callback(message, sender, sendResponse);
    }
  });
}

export async function promisifyMessage<P = any, R = any>({ tabId, ...message }: Message<P> & { tabId?: number }): Promise<R> {
  if (!message.id) {
    message.id = Math.round(Date.now() * Math.random());
  }
  if (tabId) {
    sendMessageToTab(tabId, message);
  } else {
    sendMessage(message);
  }
  return new Promise(resolve => {
    var stopListen = onMessage<R>(({ type, payload, id }) => {
      if (type === message.type && id === message.id) {
        stopListen();
        resolve(payload);
      }
    });
  });
}

export function openOptionsPage() {
  return new Promise(resolve => {
    chrome.runtime.openOptionsPage(() => resolve(checkErrors()));
  });
}

export async function checkErrors<T>(data?: T): Promise<T> {
  const error = chrome.runtime.lastError;
  if (error) throw String(error);
  return data;
}

export function onInstall(callback: (reason: "install" | "update" | "chrome_update", details: InstalledDetails) => void) {
  const callbackWrapper = (event: InstalledDetails) => {
    callback(event.reason as "update", event);
  };
  chrome.runtime.onInstalled.addListener(callbackWrapper);
  return () => chrome.runtime.onInstalled.removeListener(callbackWrapper);
}
