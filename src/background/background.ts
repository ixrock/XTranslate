//-- Background (service worker)

import "../setup";
import { initContextMenus } from "./contextMenu.bgc";
import { listenStorageActions } from "./storage.bgc";
import { listenProxyRequestActions } from "./httpProxy.bgc";
import { listenTranslationHistoryActions } from "./history.bgc";
import { openOptionsPageOnInstall } from "./install.bgc";
import { initBackground as initMellowtel } from "../../mellowtel/mellowtel-lib";
import { listenOpenAIApiRequests } from "./openai.bgc";

initContextMenus();
openOptionsPageOnInstall();

// Listen IPC messages from "options-page" (extension window) or "content-script" pages
listenStorageActions();
listenProxyRequestActions()
listenTranslationHistoryActions();
listenOpenAIApiRequests();

// Mellowtel integration
initMellowtel();
