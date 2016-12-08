// Add context menu on text selection

import { vendors, vendorsList } from "../vendors";
import { AppState } from '../store'
import { Favorite } from "../components/favorites/favorites.types";
import orderBy = require("lodash/orderBy");
import { tabs, MessageType, MenuTranslateFavoritePayload, MenuTranslateVendorPayload } from "../extension";

export function updateContextMenu(state: AppState) {
  var menuName = "XTranslate";
  const contexts = ['selection'];
  chrome.contextMenus.removeAll();

  if (state.settings.showContextMenu) {
    var topMenu = chrome.contextMenus.create({
      id: menuName,
      title: menuName,
      contexts: contexts,
    });

    // translate with current language set from settings
    vendorsList.forEach(vendor => {
      chrome.contextMenus.create({
        id: [MessageType.MENU_TRANSLATE_VENDOR, vendor.name].join("-"),
        title: `Translate with ${vendor.title}`,
        parentId: topMenu,
        contexts: contexts,
      });
    });

    // translate from favorites
    var favorites = state.favorites;
    var favCount = Object.keys(favorites).reduce((count, vendor) => count + favorites[vendor].length, 0);
    if (favCount) {
      const { langFrom, langTo } = state.settings;
      var favMenu = chrome.contextMenus.create({
        id: "favorites",
        title: "Favorites",
        parentId: topMenu,
        contexts: contexts,
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
            parentId: favMenu,
            contexts: contexts,
          });
        });
      });
    }
  }
}

// listen menu clicks and send payload to window
chrome.contextMenus.onClicked.addListener(
    (info: chrome.contextMenus.OnClickData,
     tab: chrome.tabs.Tab) => {
      var [type, vendor, from, to] = String(info.menuItemId).split("-");
      if (+type === MessageType.MENU_TRANSLATE_VENDOR) {
        let payload: MenuTranslateVendorPayload = { vendor };
        tabs.sendMessage(tab.id, {
          type: MessageType.MENU_TRANSLATE_VENDOR,
          payload: payload
        });
      }
      if (+type === MessageType.MENU_TRANSLATE_FAVORITE) {
        let payload: MenuTranslateFavoritePayload = { vendor, from, to };
        tabs.sendMessage(tab.id, {
          type: MessageType.MENU_TRANSLATE_FAVORITE,
          payload: payload
        });
      }
    });