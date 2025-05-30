//-- Background (service worker)

import "../setup";
import { installOrUpdateAppActions } from "./install.bgc";
import { initContextMenu } from "./contextMenu.bgc";
import { listenStorageActions } from "./storage.bgc";
import { listenProxyRequestActions } from "./httpProxy.bgc";
import { listenTranslationHistoryActions } from "./history.bgc";
import { listenAIRequests } from "./open-ai.bgc";
import { listenScriptingActions } from "./scripting.bgc";
import { initActiveTabWatcher } from "./tabs.bgc";

initContextMenu();
initActiveTabWatcher();
installOrUpdateAppActions();

// Listen IPC messages from "options-page" (extension window) or "content-script" pages
listenScriptingActions();
listenStorageActions();
listenProxyRequestActions()
listenTranslationHistoryActions();
listenAIRequests();
