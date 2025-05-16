// Global browser's context menu

import { autorun } from "mobx";
import { getActiveTab, getManifest, MessageType, sendMessageToTab, TranslatePagePayload } from "../extension";
import { settingsStorage } from "../components/settings/settings.storage";
import { getTranslator } from "../providers";
import { getMessage, i18nInit } from "../i18n";

export async function initContextMenu() {
  const { name: appName } = getManifest();

  await settingsStorage.load();
  await i18nInit();

  return autorun(() => {
    const { fullPageTranslation: { provider, langTo } } = settingsStorage.get();
    const translator = getTranslator(provider);

    chrome.contextMenus.removeAll(); // clean up for `autorun`
    chrome.contextMenus.create({
      id: appName,
      contexts: [chrome.contextMenus.ContextType.ALL],
      title: getMessage("context_menu_translate_full_page", {
        lang: translator.langTo[langTo],
      }),
    });

    chrome.contextMenus.onClicked.addListener(onContextMenuClick);
  })
}

async function onContextMenuClick({ pageUrl }: chrome.contextMenus.OnClickData) {
  const activeTab = await getActiveTab();

  void sendMessageToTab<TranslatePagePayload>(activeTab.id, {
    type: MessageType.TRANSLATE_FULL_PAGE,
    payload: {
      pageUrl,
    }
  });
}
