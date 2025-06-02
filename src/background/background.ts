//-- Background (service worker)

import "../setup";

import "./storage.bgc";
import "./scripting.bgc";
import "./history.bgc";
import "./open-ai.bgc";

import { installOrUpdateAppActions } from "./install.bgc";
import { initActiveTabWatcher } from "./tabs.bgc";
import { initContextMenu } from "./contextMenu.bgc";
import { listenProxyRequestActions } from "./httpProxy.bgc";

initContextMenu();
initActiveTabWatcher();
installOrUpdateAppActions();
listenProxyRequestActions();
