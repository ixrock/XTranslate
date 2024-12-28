//-- Extension install event handlers

import { onInstallExtension, openOptionsPage } from '../extension'
import { rateLastTimestamp } from "../components/app/app-rate.storage";
import { isDevelopment } from "../common-vars";
import { onContextInvalidated } from "./contextInvalidated.bgc";

export function onInstallAction(callback: () => void) {
  return onInstallExtension((reason) => {
    if (reason === "install") callback();
  });
}

export function onUpdateAction(callback: () => void) {
  return onInstallExtension((reason) => {
    if (reason === "update") callback();
  });
}

export function onInstall() {
  return [
    onInstallAction(async () => {
      await rateLastTimestamp.load();
      rateLastTimestamp.set(Date.now());
      void openOptionsPage();
    }),

    onUpdateAction(() => {
      if (isDevelopment) {
        void openOptionsPage();
      }
      void onContextInvalidated()
    }),
  ];
}
