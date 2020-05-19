// Extension's context menu

import { autorun } from "mobx";
import { __i18n, createTab, getActiveTab, getManifest, MenuTranslateFavoritePayload, MenuTranslateVendorPayload, MessageType, sendTabMessage } from "../extension";
import { favoritesStore, IFavorite } from "../components/input-translation/favorites.store";
import { settingsStore } from "../components/settings/settings.store";
import { getTranslators } from "../vendors";

// handle menu clicks
chrome.contextMenus.onClicked.addListener(
  async (info: chrome.contextMenus.OnClickData) => {
    var [type, vendor, from, to] = String(info.menuItemId).split("-");
    var selectedText = info.selectionText;
    var tab = await getActiveTab();

    var enumType = Number(type);
    if (enumType === MessageType.MENU_TRANSLATE_WITH_VENDOR) {
      let payload: MenuTranslateVendorPayload = { vendor, selectedText };
      sendTabMessage(tab.id, {
        type: MessageType.MENU_TRANSLATE_WITH_VENDOR,
        payload: payload
      });
    }
    if (enumType === MessageType.MENU_TRANSLATE_FAVORITE) {
      let payload: MenuTranslateFavoritePayload = { vendor, from, to, selectedText };
      sendTabMessage(tab.id, {
        type: MessageType.MENU_TRANSLATE_FAVORITE,
        payload: payload
      });
    }
    if (enumType === MessageType.MENU_TRANSLATE_FULL_PAGE) {
      var { langTo } = settingsStore.data;
      var translatePageUrl = "";
      switch (vendor) {
        case "google":
          translatePageUrl = `https://translate.google.com/translate?tl=${langTo}&u=${tab.url}`;
          break;
        case "yandex":
          translatePageUrl = `https://translate.yandex.com/translate?lang=${langTo}&url=${tab.url}`;
          break;
        case "bing":
          translatePageUrl = `http://www.microsofttranslator.com/bv.aspx?to=${langTo}&a=${tab.url}`;
          break;
      }
      createTab(translatePageUrl);
    }
  }
);

// refresh context menu regarding the settings and favorites list
autorun(() => {
  var menuName = getManifest().name;
  var selectionContext = ['selection'];
  var pageContext = [...selectionContext, 'page'];
  var translators = getTranslators();

  chrome.contextMenus.removeAll();

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
        favorites.forEach((fav: IFavorite) => {
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
}, { delay: 250 });
