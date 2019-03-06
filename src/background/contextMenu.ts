// Extension's context menu

import { autorun } from "mobx";
import { __i18n, createTab, getActiveTab, getManifest, MenuTranslateFavoritePayload, MenuTranslateVendorPayload, MessageType, sendTabMessage } from "../extension";
import { Favorite, favoritesStore } from "../components/input-translation/favorites.store";
import { settingsStore } from "../components/settings/settings.store";
import { getTranslatorByName, getTranslators } from "../vendors";
import orderBy from "lodash/orderBy";

// handle menu clicks
chrome.contextMenus.onClicked.addListener(
  async (info: chrome.contextMenus.OnClickData) => {
    var settings = settingsStore.data;
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
      var { langTo } = settings;
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

// create, update or hide context menu regarding the settings
autorun(() => {
  chrome.contextMenus.removeAll(); // clean up

  var settings = settingsStore.data;
  var favorites = favoritesStore.data;
  var menuName = getManifest().name;
  var selectionContext = ['selection'];
  var pageContext = selectionContext.concat('page');
  var translators = getTranslators();

  if (settings.showInContextMenu) {
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
    var favCount = Object.keys(favorites).reduce((count, vendor) => count + favorites[vendor].length, 0);
    if (favCount) {
      chrome.contextMenus.create({
        id: Math.random().toString(),
        parentId: topMenu,
        type: "separator",
        contexts: selectionContext,
      });
      Object.keys(favorites).forEach(vendorName => {
        var vendor = getTranslatorByName(vendorName);
        var favList: Favorite[] = orderBy(favorites[vendorName], [
          (fav: Favorite) => fav.from !== 'auto',
          'from'
        ]);
        favList.forEach(fav => {
          var id = [MessageType.MENU_TRANSLATE_FAVORITE, vendorName, fav.from, fav.to].join('-');
          var title = `${vendor.title} (${[vendor.langFrom[fav.from], vendor.langTo[fav.to]].join(' → ')})`;
          chrome.contextMenus.create({
            id: id,
            title: title,
            parentId: topMenu,
            contexts: selectionContext,
          });
        });
      });
    }
  }
});
