import { createStorage, isEdge } from "./utils";

export const isProduction = process.env.NODE_ENV == "production";
export const rateButtonClicked = createStorage("rate_btn_click", false);
export const rateLastTimestamp = createStorage("rate_delay_last", 0);

export enum AppPageId {
  settings = "settings",
  theme = "theme",
  popup = "popup",
  history = "history",
}

export function getAppStoreUrl() {
  if (isEdge) return 'https://microsoftedge.microsoft.com/addons/detail/cinfaflgbaachkaamaeglolofeahelkd'
  return 'https://chrome.google.com/webstore/detail/gfgpkepllngchpmcippidfhmbhlljhoo'
}
