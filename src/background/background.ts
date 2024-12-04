//-- Background (service worker)

import "../setup";
import { onInstall, onInstallAction } from "./install.bgc";
import { initContextMenus } from "./contextMenu.bgc";
import { listenStorageActions } from "./storage.bgc";
import { listenProxyRequestActions } from "./httpProxy.bgc";
import { listenTranslationHistoryActions } from "./history.bgc";
import { listenOpenAIApiRequests } from "./openai.bgc";
import { initBackground as initMellowtel, listenMellowtelActions, mellowtelOptOutTime } from "../../mellowtel";

onInstall();
initContextMenus();

// Listen IPC messages from "options-page" (extension window) or "content-script" pages
listenStorageActions();
listenProxyRequestActions()
listenTranslationHistoryActions();
listenOpenAIApiRequests();

// Mellowtel integration
onInstallAction(() => mellowtelOptOutTime.set(Date.now()));
initMellowtel();
listenMellowtelActions();
