import { Vendor } from './vendor'
import { google } from './google'
import { yandex } from './yandex'

export * from './vendor'

export const vendors: Vendor[] = [google, yandex];

export function getVendor(name: string) {
  return vendors.find(vendor => vendor.name === name) || vendors[0];
}

export function getNextVendor(currentVendor: string, langFrom: string, langTo: string, reverse = false) {
  var vendor: Vendor;
  var list: Vendor[] = [];
  var index = vendors.findIndex(vendor => vendor.name === currentVendor);
  var beforeCurrent = vendors.slice(0, index);
  var afterCurrent = vendors.slice(index + 1);
  if (reverse) {
    list.push(...beforeCurrent.reverse(), ...afterCurrent.reverse());
  } else {
    list.push(...afterCurrent, ...beforeCurrent)
  }
  while (vendor = list.shift()) {
    if (vendor.canTranslate(langFrom, langTo)) return vendor;
  }
  return null;
}