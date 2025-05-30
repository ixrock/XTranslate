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

export function isBackgroundWorker(): boolean {
  const backgroundURL = getURL("_generated_background_page.html"); // FIXME: old-school background.scripts[] in manifest@v3 in firefox so far
  return location.href.startsWith(backgroundURL);
}

export function isOptionsPage(): boolean {
  const optionsHtmlPage = getManifest().options_ui.page.split("?")[0];
  return location.href.startsWith(getURL(optionsHtmlPage));
}

export async function sendMessage<Request, Response = unknown, Error = unknown>({ tabId, ...message }: Message<Request>): Promise<Response> {
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

export async function sendMessageSafe<Payload, Response = unknown>(msg: Message<Payload>): Promise<Response> {
  try {
    return await sendMessage(msg);
  } catch (err) {
    if (isRuntimeConnectionFailedError(err)) return; // noop
    throw err;
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

export async function openOptionsPage() {
  return chrome.runtime.openOptionsPage();
}

export function onInstallExtension(callback: (reason: "install" | "update" | "chrome_update", details: InstalledDetails) => void) {
  const callbackWrapper = (event: InstalledDetails) => {
    callback(event.reason as "update", event);
  };
  chrome.runtime.onInstalled.addListener(callbackWrapper);
  return () => chrome.runtime.onInstalled.removeListener(callbackWrapper);
}

export function isContextInvalidatedError(err: Error) {
  return String(err).includes("Extension context invalidated");
}

export function isRuntimeConnectionFailedError(err: Error) {
  return String(err).includes("Could not establish connection. Receiving end does not exist");
}
