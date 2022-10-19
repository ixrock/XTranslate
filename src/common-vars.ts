// Common variables for any process: background page (main), options page (renderer), user-script, etc.

export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = !isProduction;

// Extension's public store url for different browsers besides Chrome, e.g. Brave, MS Edge, etc.
export const chromeStoreURL = 'https://chrome.google.com/webstore/detail/gfgpkepllngchpmcippidfhmbhlljhoo';
export const edgeAddonsURL = 'https://microsoftedge.microsoft.com/addons/detail/cinfaflgbaachkaamaeglolofeahelkd';
export const getExtensionUrl = () => navigator.userAgent.match(/Edge?\//) ? edgeAddonsURL : chromeStoreURL;

// webpack: generated output filenames without extension (*.js, *.css)
export const appEntry = "app";
export const serviceWorkerEntry = "background"; // keep in sync with manifest.json
export const contentScriptEntry = "user-script"; // keep in sync with manifest.json
