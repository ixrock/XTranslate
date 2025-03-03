//-- Background (service worker)

import "../setup";
import { onInstall } from "./install.bgc";
import { initContextMenus } from "./contextMenu.bgc";
import { listenStorageActions } from "./storage.bgc";
import { listenProxyRequestActions } from "./httpProxy.bgc";
import { listenTranslationHistoryActions } from "./history.bgc";
import { listenOpenAIApiRequests } from "./openai.bgc";
import { listenDeepSeekRequests } from "./deepseek.bgc";
// import { initBackground as initMellowtel, listenMellowtelActions } from "../../mellowtel";

onInstall();
initContextMenus();

// Listen IPC messages from "options-page" (extension window) or "content-script" pages
listenStorageActions();
listenProxyRequestActions()
listenTranslationHistoryActions();
listenOpenAIApiRequests();
listenDeepSeekRequests();

// Mellowtel integration
// initMellowtel();
// listenMellowtelActions();
