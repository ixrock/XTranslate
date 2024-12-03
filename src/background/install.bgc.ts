//-- Extension install event handlers

import { isDevelopment } from "../common-vars";
import { onInstall, openOptionsPage } from '../extension'
import { rateLastTimestamp } from "../components/app/app-rate.storage";

export function onInstallActions(callback?: () => Promise<void> | any) {
  return onInstall(async (reason) => {
    if (reason === "install" || isDevelopment) {
      await rateLastTimestamp.load();
      rateLastTimestamp.set(Date.now());
      await callback?.();
      await openOptionsPage();
    }
  });
}
