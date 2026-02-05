// Global browser's context menu

import { autorun } from "mobx";
import { getManifest, translateActivePage } from "../extension";
import { settingsStorage } from "../components/settings/settings.storage";
import { activeTabStorage } from "./tabs.bgc";
import { getTranslator } from "../providers";
import { getMessage, i18nInit } from "../i18n";

export async function initContextMenu() {
  const { name: appName } = getManifest();

  await settingsStorage.load();
  await activeTabStorage.load();
  await i18nInit();

  return autorun(() => {
    const { fullPageTranslation } = settingsStorage.get();
    const { provider, langTo, alwaysTranslatePages, showInContextMenu } = fullPageTranslation;

    if (!showInContextMenu) {
      chrome.contextMenus.removeAll();
      return;
    }

    const translator = getTranslator(provider);
    const activeTab = activeTabStorage.get();
    const autoTranslateEnabled = activeTab.url && alwaysTranslatePages.includes(new URL(activeTab.url).origin);

    const startTranslatePageTitle = getMessage("context_menu_translate_full_page_context_menu", {
      lang: translator.langTo[langTo] ?? langTo,
    });
    const stopTranslatePageTitle = getMessage("context_menu_translate_full_page_context_menu_stop", {
      site: `"${activeTab.title}" - ${activeTab.url}`,
    });

    chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
      id: appName,
      contexts: [chrome.contextMenus.ContextType.ALL],
      title: autoTranslateEnabled ? stopTranslatePageTitle : startTranslatePageTitle,
    });

    chrome.contextMenus.onClicked.addListener(translateActivePage);
  })
}
