// Chrome extension's runtime api helpers
import { Message } from './messages'
import { sendTabMessage } from "./tabs";

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

export function getBackgroundPage(): Promise<Window> {
  return new Promise(resolve => {
    chrome.runtime.getBackgroundPage(bgcPage => resolve(runtimeErrorCheck(bgcPage)))
  })
}

export function sendMessage<P>(message: Message<P>) {
  chrome.runtime.sendMessage(message)
}

export type OnMessageCallback<P = any> = (
  message: Message<P>,
  sender: chrome.runtime.MessageSender,
  sendResponse: <R = any>(payload: R) => void
) => void;

export function onMessage<P = any>(callback: OnMessageCallback<P>) {
  var listener: OnMessageCallback = (message, sender) => {
    if (getId() !== sender.id) {
      return;
    }
    var sendResponse = (payload: any) => {
      var responseMsg: Message = {
        id: message.id,
        type: message.type,
        payload: payload,
      }
      if (sender.tab) sendTabMessage(sender.tab.id, responseMsg);
      else {
        // e.g. browser action window could catch response in this way
        sendMessage(responseMsg);
      }
    }
    callback(message, sender, sendResponse);
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}

export async function promisifyMessage<P = any, R = any>({ tabId, ...message }: Message<P> & { tabId?: number }): Promise<R> {
  if (!message.id) {
    message.id = Number(Date.now() * Math.random()).toString(16);
  }
  if (tabId) sendTabMessage(tabId, message);
  else {
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

export async function runtimeErrorCheck<T>(data?: T): Promise<T> {
  const error = chrome.runtime.lastError;
  if (error) throw String(error);
  return data;
}
