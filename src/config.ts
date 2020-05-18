// App's common vars
import { createStorage, isEdge } from "./utils";

export class Config {
  chromeStoreUrl = 'https://chrome.google.com/webstore/detail/gfgpkepllngchpmcippidfhmbhlljhoo';
  edgeStoreUrl = 'https://microsoftedge.microsoft.com/addons/detail/cinfaflgbaachkaamaeglolofeahelkd';
  rateBtnClicked = createStorage("rate_btn_click", false);
  rateDelayLastTime = createStorage("rate_delay_last", 0);
}

export function getAppStoreUrl() {
  return isEdge ? config.edgeStoreUrl : config.chromeStoreUrl;
}

export var config = new Config();