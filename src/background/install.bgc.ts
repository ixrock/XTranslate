//-- Extension install event handlers

import { isDevelopment } from "../common-vars";
import { onInstallExtension, openOptionsPage } from '../extension'
import { rateLastTimestamp } from "../components/app/app-rate.storage";

export function onInstallAction(callback: () => void) {
  return onInstallExtension((reason) => {
    if (reason === "install" || isDevelopment) callback();
  });
}

export function onInstall() {
  return onInstallAction(async () => {
    await rateLastTimestamp.load();
    rateLastTimestamp.set(Date.now());
    void openOptionsPage();
  });
}
