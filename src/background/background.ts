//-- Background (service worker)

import "../setup";
import { onInstallActions } from "./install.bgc";
import { initContextMenus } from "./contextMenu.bgc";
import { listenStorageActions } from "./storage.bgc";
import { listenProxyRequestActions } from "./httpProxy.bgc";
import { listenTranslationHistoryActions } from "./history.bgc";
import { initBackground as initMellowtel, mellowtelOptOutTime } from "../../mellowtel/mellowtel-lib";
import { listenOpenAIApiRequests } from "./openai.bgc";

initContextMenus();
onInstallActions(() => mellowtelOptOutTime.set(Date.now()));

// Listen IPC messages from "options-page" (extension window) or "content-script" pages
listenStorageActions();
listenProxyRequestActions()
listenTranslationHistoryActions();
listenOpenAIApiRequests();

// Mellowtel integration
initMellowtel();
