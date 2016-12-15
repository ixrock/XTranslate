// Context menu item

import { vendors, vendorsList } from "../vendors";
import { AppState } from '../store'
import { Favorite } from "../components/favorites/favorites.types";
import orderBy = require("lodash/orderBy");
import { tabs, getManifest, __i18n } from "../extension";
import { MessageType, MenuTranslateFavoritePayload, MenuTranslateVendorPayload } from "../extension";

// create, update or hide context menu regarding to app's settings
export function updateContextMenu(state: AppState) {
  var menuName = getManifest().name;
  const selectionContext = ['selection'];
  const pageContext = selectionContext.concat('page');
  chrome.contextMenus.removeAll();

  if (state.settings.showInContextMenu) {
    var topMenu = chrome.contextMenus.create({
      id: menuName,
      title: menuName,
      contexts: pageContext,
    });

    // translate active page in new tab
    vendorsList.forEach(vendor => {
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
    vendorsList.forEach(vendor => {
      chrome.contextMenus.create({
        id: [MessageType.MENU_TRANSLATE_WITH_VENDOR, vendor.name].join("-"),
        title: __i18n("context_menu_translate_selection", ['"%s"', vendor.title]).join(""),
        parentId: topMenu,
        contexts: selectionContext,
      });
    });

    // translate from favorites
    var favorites = state.favorites;
    var favCount = Object.keys(favorites).reduce((count, vendor) => count + favorites[vendor].length, 0);
    if (favCount) {
      chrome.contextMenus.create({
        id: Math.random().toString(),
        parentId: topMenu,
        type: "separator",
        contexts: selectionContext,
      });
      Object.keys(favorites).forEach(vendorName => {
        var vendor = vendors[vendorName];
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
}

// context menu clicks handler
export function bindContextMenu(getState: () => AppState) {
  const onContextMenu = (info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab) => {
    var [type, vendor, from, to] = String(info.menuItemId).split("-");
    var enumType = Number(type);
    if (enumType === MessageType.MENU_TRANSLATE_WITH_VENDOR) {
      let payload: MenuTranslateVendorPayload = { vendor };
      tabs.sendMessage(tab.id, {
        type: MessageType.MENU_TRANSLATE_WITH_VENDOR,
        payload: payload
      });
    }
    if (enumType === MessageType.MENU_TRANSLATE_FAVORITE) {
      let payload: MenuTranslateFavoritePayload = { vendor, from, to };
      tabs.sendMessage(tab.id, {
        type: MessageType.MENU_TRANSLATE_FAVORITE,
        payload: payload
      });
    }
    if (enumType === MessageType.MENU_TRANSLATE_FULL_PAGE) {
      var { langTo } = getState().settings;
      tabs.getActive().then(tab => {
        var pageUrl = tab.url;
        var url = "";
        switch (vendor) {
          case "google":
            url = `https://translate.google.com/translate?tl=${langTo}&u=${pageUrl}`;
            break;
          case "yandex":
            url = `https://translate.yandex.com/translate?lang=${langTo}&url=${pageUrl}`;
            break;
          case "bing":
            url = `http://www.microsofttranslator.com/bv.aspx?to=${langTo}&a=${pageUrl}`;
            break;
        }
        tabs.open(url);
      });
    }
  };
  chrome.contextMenus.onClicked.addListener(onContextMenu);
}