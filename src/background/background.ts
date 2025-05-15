//-- Background (service worker)

import "../setup";
import { onInstall } from "./install.bgc";
import { initContextMenu } from "./contextMenu.bgc";
import { listenStorageActions } from "./storage.bgc";
import { listenProxyRequestActions } from "./httpProxy.bgc";
import { listenTranslationHistoryActions } from "./history.bgc";
import { listenAIRequests } from "./open-ai.bgc";
import { initBackground as initMellowtel, listenMellowtelActions } from "../../mellowtel";

onInstall();
initContextMenu();

// Listen IPC messages from "options-page" (extension window) or "content-script" pages
listenStorageActions();
listenProxyRequestActions()
listenTranslationHistoryActions();
listenAIRequests();

// Mellowtel integration
initMellowtel();
listenMellowtelActions();
