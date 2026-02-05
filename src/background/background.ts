//-- Background (service worker)

import "../setup";
import "./storage.bgc";
import "./scripting.bgc";
import "./history.bgc";
import "./ai.bgc";
import "./metrics.bgc";

import { installOrUpdateAppActions } from "./install.bgc";
import { initActiveTabWatcher } from "./tabs.bgc";
import { initContextMenu } from "./contextMenu.bgc";
import { listenProxyConnection, listenProxyRequestActions } from "./httpProxy.bgc";
import { initBackground as initMellowtel } from "../../mellowtel";

initMellowtel();
initContextMenu();
initActiveTabWatcher();
installOrUpdateAppActions();
listenProxyRequestActions();
listenProxyConnection();
