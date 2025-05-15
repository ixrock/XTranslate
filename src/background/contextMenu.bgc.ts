// Global browser's context menu

import { autorun } from "mobx";
import { createTab, getManifest } from "../extension";
import { settingsStorage } from "../components/settings/settings.storage";
import { getTranslator, ProviderCodeName } from "../providers";
import { getMessage, i18nInit } from "../i18n";

const { name: appName } = getManifest();
const { ContextType } = chrome.contextMenus;
const translator = getTranslator(ProviderCodeName.GOOGLE);

export async function initContextMenu() {
  await settingsStorage.load();
  await i18nInit();

  return autorun(() => {
    const { langTo } = settingsStorage.get();

    chrome.contextMenus.removeAll(); // clean up
    chrome.contextMenus.create({
      id: appName,
      contexts: [ContextType.ALL],
      title: getMessage("context_menu_translate_full_page", {
        lang: translator.langTo[langTo],
      }),
    });

    chrome.contextMenus.onClicked.addListener(onContextMenuClick);
  })
}

// TODO: replace with in-place full-page translations
function onContextMenuClick(info: chrome.contextMenus.OnClickData) {
  const { langTo } = settingsStorage.get();
  const { frameUrl, pageUrl = frameUrl } = info;
  const actionUrl = translator.getFullPageTranslationUrl(pageUrl, langTo);
  void createTab(actionUrl);
}
