// Common variables for any process: background page (main), options page (renderer), content-script, etc.

export const isDevelopment = process.env.NODE_ENV === "development";

// Extension's public store url for different browsers besides Chrome, e.g. Brave, MS Edge, etc.
export const chromeStoreURL = 'https://chrome.google.com/webstore/detail/gfgpkepllngchpmcippidfhmbhlljhoo';
export const edgeAddonsURL = 'https://microsoftedge.microsoft.com/addons/detail/cinfaflgbaachkaamaeglolofeahelkd';

// Webpack: app build, generated output filenames without extension (*.js, *.css)
export const appEntry = "app";
export const serviceWorkerEntry = "background"; // keep in sync with manifest.json
export const contentScriptEntry = "content-script"; // keep in sync with manifest.json
export const pdfViewerEntry = "pdf-viewer";

// Icons, see also: https://fonts.google.com/icons
export const iconMaterialFavorite = "star";
export const iconMaterialFavoriteOutlined = "star_outline";

//
// Env-specific data helpers
//
export function getExtensionUrl(): string {
  return isEdge() ? edgeAddonsURL : chromeStoreURL;
}

export function isMac(): boolean {
  return !!navigator.userAgent.match(/AppleWebKit|Macintosh/);
}

export function isPdf(): boolean {
  return document.contentType === "application/pdf";
}

export function isChrome(): boolean {
  return !!navigator.userAgent.match(/chrome\/(?:\d+\.?)+/i);
}

export function isEdge(): boolean {
  return !!navigator.userAgent.match(/Edge?\//);
}

export function isSystemPage(pageUrl = ""): boolean {
  return !!pageUrl.match(/^(chrome|edge):\/\//i);
}
