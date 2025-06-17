//-- Extension install event handlers

import { isDevelopment } from "../common-vars";
import { refreshContentScripts } from "./scripting.bgc";
import { onInstallExtension, openOptionsPage } from '../extension'

export function installOrUpdateAppActions() {
  const { INSTALL, UPDATE } = chrome.runtime.OnInstalledReason;

  return onInstallExtension(async (reason) => {
    if (reason === INSTALL || isDevelopment) {
      void openOptionsPage();
    }

    // refresh content-scripts due context-invalidated (e.g. extension version update)
    if (reason === UPDATE) {
      void refreshContentScripts();
    }
  });
}
