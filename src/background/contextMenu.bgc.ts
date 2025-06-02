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
    const { fullPageTranslation: { provider, langTo, alwaysTranslatePages } } = settingsStorage.get();
    const translator = getTranslator(provider);
    const activeTab = activeTabStorage.get();
    const url = new URL(activeTab.url || location.href);

    const startTranslatePageTitle = getMessage("context_menu_translate_full_page_context_menu", {
      lang: translator.langTo[langTo] ?? langTo,
    });
    const stopTranslatePageTitle = getMessage("context_menu_translate_full_page_context_menu_stop", {
      site: `"${activeTab.title}" - ${activeTab.url}`,
    });

    const isTranslatedWebsite = alwaysTranslatePages.includes(url.origin);

    chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
      id: appName,
      contexts: [chrome.contextMenus.ContextType.ALL],
      title: isTranslatedWebsite ? stopTranslatePageTitle : startTranslatePageTitle,
    });

    chrome.contextMenus.onClicked.addListener(translateActivePage);
  })
}
