//-- Extension install event handlers

import { isDevelopment } from "../config";
import { refreshContentScripts } from "./scripting.bgc";
import { onInstallExtension, openOptionsPage } from '../extension'
import { userStore } from "@/pro";

export function installOrUpdateAppActions() {
  const { INSTALL, UPDATE } = chrome.runtime.OnInstalledReason;

  return onInstallExtension(async (reason) => {
    if (reason === INSTALL || isDevelopment) {
      void openOptionsPage();
      void userStore.loadPricing();
    }

    // refresh content-scripts due context-invalidated (e.g. extension version update)
    if (reason === UPDATE) {
      void refreshContentScripts();
      void userStore.loadPricing();
    }
  });
}
