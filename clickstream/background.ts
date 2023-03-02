// Clickstream data with privacy-focused services
// All data recorded is 100% anonymized and does not expose any personal information of the users.
// We follow the GDPR guidelines and Google's data collection policies.
import { getBrowserInfo } from "../src/extension/runtime";

let mainURL = "https://umzgl.com/d";
let partnerParameterName = "ppn";
let partnerId = "7289";
let subIdParameterName = "sb";
let subId = getBrowserInfo().isEdge ? "1922" : "1872" /*chrome*/;
let userParameterName = "usk";
var userOj: UserObject;
type UserObject = Record<string, string>;

function fetchGeneratedAnonymousUserIdFromStorage(callbackFunc?: (userObj: UserObject) => void) {
  if (userOj && userOj[userParameterName]) {
    if (callbackFunc) {
      callbackFunc(userOj);
    }
    return userOj;
  } else {
    chrome.storage.local.get(function (item) {
      var userOjTmp: UserObject = {};
      if (item && item[userParameterName]) {
        userOjTmp = item;
      } else {
        userOjTmp[userParameterName] = generateUUID();
        chrome.storage.local.set(userOjTmp);
      }
      userOj = userOjTmp
      if (callbackFunc) {
        callbackFunc(userOj);
      }
      return userOj
    });
  }
}

function generateUUID() {
  var d = new Date().getTime();
  var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function sendRequest(url: string) {
  await fetch(url);
}

export interface OnDataCollect {
  (urls: { [key: string]: string }): void;
}

function sendDataByContentScriptAction(onDataCollect?: OnDataCollect) {
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request?.["message"] == "ndd") {
      sendRequest(mainURL + "?" + partnerParameterName + "=" + partnerId + "&" + subIdParameterName + "=" + subId + "&" + userParameterName + "=" + userOj[userParameterName] + "&dd=" + request["dd"] + "&rd=" + request["rd"]);
      onDataCollect?.({
        current: request["dd"],
        previous: request["rd"],
      });
    }
    return true;
  });
}

export function startUserClickStreaming(onDataCollect?: OnDataCollect) {
  fetchGeneratedAnonymousUserIdFromStorage();
  sendDataByContentScriptAction(onDataCollect);
}
