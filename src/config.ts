// App's common vars
import { createStorage } from "./utils/createStorage";

export class Config {
  storeUrl = 'https://chrome.google.com/webstore/detail/gfgpkepllngchpmcippidfhmbhlljhoo';
  rateBtnClicked = createStorage("rate_btn_click", false);
  rateDelayLastTime = createStorage("rate_delay_last", 0);
}

export var config = new Config();