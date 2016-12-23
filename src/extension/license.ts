import { createStorage } from "../utils/createStorage";
import { getPurchases, getSkuDetails, buy } from "./payments";
import find = require("lodash/find");
const installTime = createStorage<number>('installTime', Date.now(), true);
const trialPeriodTime = 1000 * 60 * 60 * 24 * 14;

export async function buyApp() {
  return buy("license");
}

export async function checkLicense(allowAds = false) {
  if (!trialIsOver() || allowAds) return;
  return getPurchases().then(result => {
    var license = find(result.response.details, { sku: "license", state: "ACTIVE" });
    if (!license) throw new Error("no-license");
    return license;
  });
}

export async function checkPrice() {
  return getSkuDetails().then(result => {
    var license = find(result.response.details.inAppProducts, { sku: "license" });
    var price = license.prices[0];
    return (parseInt(price.valueMicros) * 1e-6) + " " + price.currencyCode;
  });
}

export function trialIsOver() {
  var time = installTime();
  if (!+time || time > Date.now()) installTime(Date.now() - trialPeriodTime - 1000);
  return installTime() + trialPeriodTime < Date.now();
}