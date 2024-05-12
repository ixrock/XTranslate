//-- Extension install event handlers

import { isProduction } from "../common-vars";
import { onInstall, openOptionsPage } from '../extension'
import { rateLastTimestamp } from "../components/app/app-rate.storage";

export function openOptionsPageOnInstall() {
  return onInstall(async (reason) => {
    if (reason === "install" || !isProduction) {
      await rateLastTimestamp.load();
      rateLastTimestamp.set(Date.now());
      await openOptionsPage();
    }
  });
}
