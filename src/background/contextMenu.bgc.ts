// Create extension's menu-item for global browser's context menu
// Works only when enabled in the extension settings (default: false)

import { autorun } from "mobx";
import { createTab, getActiveTab, getManifest, MessageType, sendMessageToTab, TranslateWithVendorPayload } from "../extension";
import { settingsStorage } from "../components/settings/settings.storage";
import { getTranslator, getTranslators } from "../vendors";
import { getMessage, i18nInit } from "../i18n";

export async function initContextMenus() {
  await settingsStorage.load();
  await i18nInit();

  return autorun(refreshContextMenus);
}

export function refreshContextMenus() {
  const { SELECTION, PAGE } = chrome.contextMenus.ContextType;
  const { showInContextMenu } = settingsStorage.get();
  const appName = getManifest().name;
  const translators = getTranslators();

  chrome.contextMenus.removeAll(); // clean up before reassign
  chrome.contextMenus.onClicked.addListener(onClickMenuItem);
  if (!showInContextMenu) return; // skip re-creating

  chrome.contextMenus.create({
    id: appName,
    title: appName,
    contexts: [SELECTION, PAGE],
  });

  // translate full page in new tab
  translators.forEach(vendor => {
    if (!vendor.getFullPageTranslationUrl("", "")) return; // skip, doesn't supported
    chrome.contextMenus.create({
      id: [MessageType.TRANSLATE_FULL_PAGE, vendor.name].join("-"),
      parentId: appName,
      contexts: [SELECTION, PAGE],
      title: getMessage("context_menu_translate_full_page", {
        translator: vendor.title,
      }) as string,
    });
  });

  //--------------------------
  chrome.contextMenus.create({
    id: Math.random().toString(),
    parentId: appName,
    type: "separator",
    contexts: [SELECTION],
  });

  // translate with specific vendor
  translators.forEach(vendor => {
    chrome.contextMenus.create({
      id: [MessageType.TRANSLATE_WITH_VENDOR, vendor.name].join("-"),
      parentId: appName,
      contexts: [SELECTION],
      title: getMessage("context_menu_translate_selection", {
        selection: '"%s"',
        translator: vendor.title,
      }) as string,
    });
  });
}

// Handle menu clicks from web content pages
async function onClickMenuItem(info: chrome.contextMenus.OnClickData) {
  var { selectionText, frameUrl, pageUrl = frameUrl } = info;
  var [type, vendor] = String(info.menuItemId).split("-");

  switch (type) {
  case MessageType.TRANSLATE_FULL_PAGE: {
    const { langTo } = settingsStorage.get();
    const url = getTranslator(vendor).getFullPageTranslationUrl(pageUrl, langTo);
    if (url) createTab(url);
    break;
  }

  case MessageType.TRANSLATE_WITH_VENDOR: {
    const tab = await getActiveTab();
    sendMessageToTab<TranslateWithVendorPayload>(tab.id, {
      type: MessageType.TRANSLATE_WITH_VENDOR,
      payload: {
        vendor: vendor,
        text: selectionText,
      }
    });
    break;
  }
  }
}
