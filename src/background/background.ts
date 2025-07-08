//-- Background (service worker)

import "../setup";
import "./storage.bgc";
import "./scripting.bgc";
import "./history.bgc";
import "./ai.bgc";
import "./metrics.bgc";
import "../../mellowtel";

import { installOrUpdateAppActions } from "./install.bgc";
import { initActiveTabWatcher } from "./tabs.bgc";
import { initContextMenu } from "./contextMenu.bgc";
import { listenProxyRequestActions } from "./httpProxy.bgc";

initContextMenu();
initActiveTabWatcher();
installOrUpdateAppActions();
listenProxyRequestActions();
