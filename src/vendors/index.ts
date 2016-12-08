import { Vendor } from './vendor'
import { google } from './google'
import { yandex } from './yandex'
import { bing } from './bing'
import findIndex = require("lodash/findIndex");

export * from './vendor'
export * from './google'
export * from './yandex'
export * from './bing'

export const vendors: {[name: string]: Vendor} = { google, yandex, bing };
export const vendorsList: Vendor[] = Object.keys(vendors).map(vendor => vendors[vendor]);

export function getNextVendor(currentVendor: string, langFrom: string, langTo: string, reverse = false) {
  var index = findIndex(vendorsList, { name: currentVendor });
  var list: Vendor[] = [];
  var back = vendorsList.slice(0, index);
  var front = vendorsList.slice(index + 1);
  if (reverse) {
    list.push(...back.reverse(), ...front.reverse());
  } else {
    list.push(...front, ...back)
  }
  var vendor: Vendor;
  while (vendor = list.shift()) {
    if (vendor.canTranslate(langFrom, langTo)) return vendor;
  }
  return null;
}