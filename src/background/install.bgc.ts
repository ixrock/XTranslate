//-- Extension install event handlers

import { onInstallExtension, openOptionsPage } from '../extension'
import { isDevelopment } from "../common-vars";
import { rateLastTimestamp } from "../components/app/app-rate.storage";
import { refreshContentScripts } from "./scripting.bgc";

export function onInstall() {
  return onInstallExtension(async (reason) => {
    if (reason === "install" || isDevelopment) {
      await rateLastTimestamp.load();
      rateLastTimestamp.set(Date.now());
      void openOptionsPage();
    }

    // refresh content-scripts since context-invalidated (e.g. due extension auto or manual update)
    if (reason === "update") {
      void refreshContentScripts();
    }
  });
}
