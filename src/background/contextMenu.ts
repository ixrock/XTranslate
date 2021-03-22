// Extension's context menu

import { autorun } from "mobx";
import { __i18n, createTab, getActiveTab, getManifest, MenuTranslateFavoritePayload, MenuTranslateVendorPayload, MessageType, onPermissionActivated, Permission, sendTabMessage } from "../extension";
import { settingsStore } from "../components/settings/settings.storage";
import { FavoriteLangPair, favoritesStore } from "../components/input-translation/favorites.storage";
import { getTranslator, getTranslators } from "../vendors";

// Prefetch menu-dependent data from the storages first
Promise.all([settingsStore.ready, favoritesStore.ready]).then(() => {
  onPermissionActivated([Permission.ContextMenus], () => {
    return autorun(initMenus, { delay: 250 });
  });
});

export function initMenus() {
  var menuName = getManifest().name;
  var selectionContext = ['selection'];
  var pageContext = [...selectionContext, 'page'];
  var translators = getTranslators();

  chrome.contextMenus.removeAll();
  chrome.contextMenus.onClicked.addListener(onClickMenuItem);

  if (settingsStore.data.showInContextMenu) {
    var topMenu = chrome.contextMenus.create({
      id: menuName,
      title: menuName,
      contexts: pageContext,
    });

    // translate active page in new tab
    translators.forEach(vendor => {
      chrome.contextMenus.create({
        id: [MessageType.MENU_TRANSLATE_FULL_PAGE, vendor.name].join("-"),
        title: __i18n("context_menu_translate_full_page", [vendor.title]).join(""),
        parentId: topMenu,
        contexts: pageContext,
      });
    });

    chrome.contextMenus.create({
      id: Math.random().toString(),
      parentId: topMenu,
      type: "separator",
      contexts: selectionContext,
    });

    // translate with current language set from settings
    translators.forEach(vendor => {
      chrome.contextMenus.create({
        id: [MessageType.MENU_TRANSLATE_WITH_VENDOR, vendor.name].join("-"),
        title: __i18n("context_menu_translate_selection", ['"%s"', vendor.title]).join(""),
        parentId: topMenu,
        contexts: selectionContext,
      });
    });

    // translate from favorites
    if (favoritesStore.getCount() > 0) {
      chrome.contextMenus.create({
        id: Math.random().toString(),
        parentId: topMenu,
        type: "separator",
        contexts: selectionContext,
      });
      favoritesStore.getFavorites().forEach(({ vendor, favorites }) => {
        favorites.forEach((fav: FavoriteLangPair) => {
          var id = [MessageType.MENU_TRANSLATE_FAVORITE, vendor.name, fav.from, fav.to].join('-');
          var title = `${vendor.title} (${[vendor.langFrom[fav.from], vendor.langTo[fav.to]].join(' → ')})`;
          chrome.contextMenus.create({
            id: id,
            title: title,
            parentId: topMenu,
            contexts: selectionContext,
          });
        })
      });
    }
  }
}

// Handle menu clicks from web content pages
async function onClickMenuItem(info: chrome.contextMenus.OnClickData) {
  var { selectionText: selectedText, frameUrl, pageUrl = frameUrl } = info;
  var [type, vendor, from, to] = String(info.menuItemId).split("-");

  switch (type) {
    case MessageType.MENU_TRANSLATE_FULL_PAGE: {
      const { langTo } = settingsStore.data;
      const url = getTranslator(vendor).getFullPageTranslationUrl(pageUrl, langTo);
      if (url) createTab(url);
      break;
    }

    case MessageType.MENU_TRANSLATE_WITH_VENDOR: {
      const tab = await getActiveTab();
      sendTabMessage<MenuTranslateVendorPayload>(tab.id, {
        type: MessageType.MENU_TRANSLATE_WITH_VENDOR,
        payload: {
          vendor, selectedText,
        }
      });
      break;
    }

    case MessageType.MENU_TRANSLATE_FAVORITE: {
      const tab = await getActiveTab();
      sendTabMessage<MenuTranslateFavoritePayload>(tab.id, {
        type: MessageType.MENU_TRANSLATE_FAVORITE,
        payload: {
          vendor, from, to, selectedText
        }
      });
      break;
    }
  }
}
