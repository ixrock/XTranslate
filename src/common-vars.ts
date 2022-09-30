// Common variables for any process: background page (main), options page (renderer), user-script, etc.

export const isProduction = process.env.NODE_ENV === "production" && location.hash !== "debug";

// Extension's public store url for different browsers besides Chrome, e.g. Brave, MS Edge, etc.
export const chromeStoreURL = 'https://chrome.google.com/webstore/detail/gfgpkepllngchpmcippidfhmbhlljhoo';
export const edgeAddonsURL = 'https://microsoftedge.microsoft.com/addons/detail/cinfaflgbaachkaamaeglolofeahelkd';
export const firefoxAddonsURL = ''; // TODO
export const extensionUrl = navigator.userAgent.match(/Edge?\//) ? edgeAddonsURL : chromeStoreURL; // fixme
