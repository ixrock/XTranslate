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
  const bgcWorkerURL = getURL(getManifest().background.service_worker); // manifest@v3

  return location.href.startsWith(bgcWorkerURL);
}

export function isOptionsPage(): boolean {
  const optionsHtmlPage = getManifest().options_ui.page.split("?")[0];
  return location.href.startsWith(getURL(optionsHtmlPage));
}

export function getRuntimeLastError() {
  return chrome.runtime.lastError;
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

export interface OnMessageCallback<RequestPayload extends any[], Response> {
  (...req: RequestPayload): Promise<Response> | Response | undefined;
}

export function onMessage<Request extends any[], Response = unknown>(type: MessageType, getResult: OnMessageCallback<Request, Response>) {
  let _listener: (...args: any) => any;

  chrome.runtime.onMessage.addListener(function listener(message: Message<Request>, sender, sendResponse) {
    _listener = listener;

    if (message.type === type) {
      (async () => {
        try {
          const payload = [message.payload].flat() as Request;
          const data = await getResult(...payload);
          sendResponse({ data });
        } catch (error) {
          sendResponse({ error });
        }
      })();
      return true; // wait for async response: https://developer.chrome.com/docs/extensions/mv3/messaging/
    }
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

export function isContextInvalidatedError(err: Error | string): boolean {
  return String(err).includes("Extension context invalidated");
}

export function isRuntimeConnectionFailedError(err: Error | string): boolean {
  return String(err).includes("Could not establish connection. Receiving end does not exist");
}

export function isExtensionContextAlive(): boolean {
  try {
    return Boolean(chrome?.runtime?.id);
  } catch {
    return false;
  }
}
