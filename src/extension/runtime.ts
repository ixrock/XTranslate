// Chrome extension's runtime api helpers
import InstalledDetails = chrome.runtime.InstalledDetails;
import { Message, MessageType } from './messages'
import { sendMessageToTab } from "./tabs";

export function getManifest() {
  return chrome.runtime.getManifest() as chrome.runtime.ManifestV3;
}

export function getURL(path = ""): string {
  return chrome.runtime.getURL(path);
}

export function isBackgroundPage(): boolean {
  const isGeneratedBgcPage = location.href.startsWith(getURL("_generated_background_page.html"));
  if (isGeneratedBgcPage) return true;

  const serviceWorkerFile = getManifest().background.service_worker; // manifest@v3
  const bgcScriptFileV2 = (getManifest().background as chrome.runtime.ManifestV2["background"])?.scripts?.[0]; // manifest@v2
  const bgcWorkerFilePath = getURL(serviceWorkerFile ?? bgcScriptFileV2);

  return location.href.startsWith(bgcWorkerFilePath);
}

export function isOptionsPage(): boolean {
  const optionsHtmlPage = getManifest().options_ui.page.split("?")[0];
  return location.href.startsWith(getURL(optionsHtmlPage));
}

export async function sendMessage<Request, Response = any, Error = any>({ tabId, ...message }: Message<Request> & { tabId?: number }): Promise<Response> {
  let response: { data?: Response, error?: Error };

  if (tabId) {
    response = await sendMessageToTab(tabId, message);
  } else {
    response = await chrome.runtime.sendMessage(message);
  }

  if (response?.data) {
    return response.data;
  } else if (response?.error) {
    throw response.error;
  }
}

export interface OnMessageCallback<Request, Response> {
  (req: Request): Promise<Response> | Response | undefined;
}

export function onMessage<Request, Response = unknown>(type: MessageType, getResult: OnMessageCallback<Request, Response>) {
  let _listener: (...args: any) => any;

  chrome.runtime.onMessage.addListener(function listener(message: Message<Request>, sender, sendResponse) {
    _listener = listener;

    if (message.type === type) {
      try {
        Promise.resolve(getResult(message.payload))
          .then(data => sendResponse({ data }))
          .catch(error => sendResponse({ error }));
      } catch (error) {
        sendResponse({ error });
      }
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
    chrome.runtime.openOptionsPage(() => resolve(null));
  });
}

export function onInstall(callback: (reason: "install" | "update" | "chrome_update", details: InstalledDetails) => void) {
  const callbackWrapper = (event: InstalledDetails) => {
    callback(event.reason as "update", event);
  };
  chrome.runtime.onInstalled.addListener(callbackWrapper);
  return () => chrome.runtime.onInstalled.removeListener(callbackWrapper);
}
