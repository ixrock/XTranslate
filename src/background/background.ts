//-- Background (service worker)

import "../setup";
import { initContextMenus } from "./contextMenu.bgc";
import { listenStorageActions } from "./storage.bgc";
import { listenProxyRequestActions } from "./httpProxy.bgc";
import { listenTranslationHistoryActions } from "./history.bgc";
import { openOptionsPageOnInstall } from "./install.bgc";

initContextMenus();
openOptionsPageOnInstall();

// Listen IPC messages from "options-page" or "content-script" pages
listenStorageActions();
listenProxyRequestActions()
listenTranslationHistoryActions();
