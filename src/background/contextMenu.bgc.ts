// Global browser's context menu

import { autorun } from "mobx";
import { getManifest, TranslateFullPagePayload } from "../extension";
import { activeTabStorage } from "./tabs.bgc";
import { getTranslator, getTranslators, ProviderCodeName } from "../providers";
import { getMessage, i18nInit } from "../i18n";
import { translateActivePageAction } from "./translate-page.bgc";
import { FullPageContextMenuMode, pageTranslationStorage } from "@/user-script/page-translator";

export async function initContextMenu() {
  const { name: appName } = getManifest();
  const menuPrefix = `${appName}_menu_`;
  const contextMenuActionMap = new Map<string, TranslateFullPagePayload>();

  await activeTabStorage.load();
  await pageTranslationStorage.load();
  await i18nInit();

  const onContextMenuClicked = (data: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    const menuItemId = String(data.menuItemId);
    const actionPayload = contextMenuActionMap.get(menuItemId);
    if (!actionPayload) return;

    return translateActivePageAction(actionPayload);
  };

  chrome.contextMenus.onClicked.removeListener(onContextMenuClicked);
  chrome.contextMenus.onClicked.addListener(onContextMenuClicked);

  return autorun(() => {
    const { provider, langTo, langFrom, alwaysTranslatePages, contextMenuMode: menuMode } = pageTranslationStorage.get();

    if (menuMode === FullPageContextMenuMode.OFF) {
      contextMenuActionMap.clear();
      chrome.contextMenus.removeAll();
      return;
    }

    const activeTab = activeTabStorage.get();
    const activeTabOrigin = getTabOrigin(activeTab.url);
    const autoTranslateEnabled = activeTabOrigin && alwaysTranslatePages.includes(activeTabOrigin);
    const stopTranslatePageTitle = getMessage("context_menu_translate_full_page_context_menu_stop", {
      site: `"${activeTab.title}" - ${activeTab.url}`,
    });

    contextMenuActionMap.clear();
    chrome.contextMenus.removeAll();

    if (menuMode === FullPageContextMenuMode.ACTIVE_PROVIDER) {
      const startTranslatePageTitle = getStartPageTranslationTitle(provider, langTo);

      chrome.contextMenus.create({
        id: appName,
        contexts: [chrome.contextMenus.ContextType.ALL],
        title: autoTranslateEnabled ? stopTranslatePageTitle : startTranslatePageTitle,
      });
      return;
    }

    const providers = getTranslators().filter((translator) => {
      return translator.isAvailable() && translator.canTranslateFullPage();
    });

    providers.forEach((translator) => {
      const menuId = `${menuPrefix}_${translator.name}`;
      const { langTo: supportedLangTo } = translator.getSupportedLanguages({ langFrom, langTo });
      const isCurrentProvider = translator.name === provider;
      const shouldRenderStopAction = Boolean(autoTranslateEnabled && isCurrentProvider);

      const actionTitle = shouldRenderStopAction
        ? stopTranslatePageTitle
        : getStartPageTranslationTitle(translator.name, supportedLangTo);

      contextMenuActionMap.set(menuId, {
        action: shouldRenderStopAction ? "stop" : "start",
        provider: shouldRenderStopAction ? undefined : translator.name,
      });
      chrome.contextMenus.create({
        id: menuId,
        contexts: [chrome.contextMenus.ContextType.ALL],
        title: `${translator.title}: ${actionTitle}`,
      });
    });
  })
}

function getTabOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function getStartPageTranslationTitle(provider: ProviderCodeName, langTo: string): string {
  const translator = getTranslator(provider);
  if (!translator) {
    return getMessage("context_menu_translate_full_page_context_menu", { lang: langTo });
  }

  return getMessage("context_menu_translate_full_page_context_menu", {
    lang: translator.langTo[langTo] ?? langTo,
  });
}
