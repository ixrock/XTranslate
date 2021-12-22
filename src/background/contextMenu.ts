// Extension's context menu

import { autorun } from "mobx";
import { createTab, getActiveTab, getManifest, MessageType, sendMessageToTab, TranslateWithVendorPayload } from "../extension";
import { settingsStore } from "../components/settings/settings.storage";
import { getTranslator, getTranslators } from "../vendors";
import { getMessage, i18nInit } from "../i18n";
import ContextType = chrome.contextMenus.ContextType;

i18nInit().then(() => autorun(initMenus));

export function initMenus() {
  var appName = getManifest().name;
  var selectionContext: ContextType[] = ['selection'];
  var pageContext: ContextType[] = [...selectionContext, 'page'];
  var translators = getTranslators();

  chrome.contextMenus.removeAll(); // clean up before reassign
  chrome.contextMenus.onClicked.addListener(onClickMenuItem);
  if (!settingsStore.data.showInContextMenu) return; // skip re-creating

  chrome.contextMenus.create({
    id: appName,
    title: appName,
    contexts: pageContext,
  });

  // translate full page in new tab
  translators.forEach(vendor => {
    if (!vendor.getFullPageTranslationUrl("", "")) return; // skip, doesn't supported
    chrome.contextMenus.create({
      id: [MessageType.TRANSLATE_FULL_PAGE, vendor.name].join("-"),
      parentId: appName,
      contexts: pageContext,
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
    contexts: selectionContext,
  });

  // translate with specific vendor
  translators.forEach(vendor => {
    chrome.contextMenus.create({
      id: [MessageType.TRANSLATE_WITH_VENDOR, vendor.name].join("-"),
      parentId: appName,
      contexts: selectionContext,
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
      const { langTo } = settingsStore.data;
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
