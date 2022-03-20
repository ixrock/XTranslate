// Chrome extension's runtime api helpers
import InstalledDetails = chrome.runtime.InstalledDetails;
import { Message, MessageType } from './messages'
import { sendMessageToTab } from "./tabs";

export function getManifest(): chrome.runtime.ManifestV3 {
  return chrome.runtime.getManifest() as any;
}

export function getURL(path = ""): string {
  return chrome.runtime.getURL(path);
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

export async function sendMessage<Request, Response = any, Error = any>({ tabId, ...message }: Message<Request> & { tabId?: number }): Promise<Response> {
  let resolve: (data: Response) => void;
  let reject: (error: Error) => void;

  if (tabId) {
    sendMessageToTab(tabId, message, responseCallback);
  } else {
    chrome.runtime.sendMessage(message, responseCallback);
  }

  function responseCallback(res: { data?: Response, error?: Error }) {
    if (!res) return resolve(null);
    if (res.data) resolve(res.data);
    if (res.error) reject(res.error);
  }

  return new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
}

export interface OnMessageCallback<Request, Response> {
  (req: Request): Promise<Response> | Response;
}

export function onMessage<Request, Response = unknown>(type: MessageType, getResult: OnMessageCallback<Request, Response>) {
  let _listener: (...args: any) => any;

  chrome.runtime.onMessage.addListener(function listener(message: Message<Request>, sender, sendResponse) {
    _listener = listener;

    if (message.type === type) {
      Promise.resolve(getResult(message.payload))
        .then(data => sendResponse({ data }))
        .catch(error => sendResponse({ error }));
    }

    // wait for async response
    // read more: https://developer.chrome.com/docs/extensions/mv3/messaging/
    return true;
  });

  // unsubscribe disposer
  return () => {
    chrome.runtime.onMessage.removeListener(_listener);
  };
}

export function openOptionsPage() {
  return new Promise(resolve => {
    chrome.runtime.openOptionsPage(() => resolve(checkErrors()));
  });
}

export function checkErrors<T>(data?: T): T {
  const error = chrome.runtime.lastError;
  if (error) throw error;
  return data;
}

export function onInstall(callback: (reason: "install" | "update" | "chrome_update", details: InstalledDetails) => void) {
  const callbackWrapper = (event: InstalledDetails) => {
    callback(event.reason as "update", event);
  };
  chrome.runtime.onInstalled.addListener(callbackWrapper);
  return () => chrome.runtime.onInstalled.removeListener(callbackWrapper);
}
