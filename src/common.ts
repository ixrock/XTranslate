import { createStorage, isEdge } from "./utils";

export const isProduction = process.env.NODE_ENV == "production";
export const rateButtonClicked = createStorage("rate_btn_click", false);
export const rateLastTimestamp = createStorage("rate_delay_last", 0);

const chromeStoreURL = 'https://chrome.google.com/webstore/detail/gfgpkepllngchpmcippidfhmbhlljhoo';
const edgeAddonsURL = 'https://microsoftedge.microsoft.com/addons/detail/cinfaflgbaachkaamaeglolofeahelkd';

export const getAppStoreUrl = () => isEdge ? edgeAddonsURL : chromeStoreURL;
