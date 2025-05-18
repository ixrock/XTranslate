// Common variables for any process: background page (main), options page (renderer), content-script, etc.

export const isDevelopment = process.env.NODE_ENV === "development";

// Extension's public urls for different browsers besides Chrome, e.g. Brave, MS Edge, etc.
export const websiteURL = 'https://xtranslate.dev';
export const chromeStoreURL = 'https://chrome.google.com/webstore/detail/gfgpkepllngchpmcippidfhmbhlljhoo';
export const edgeAddonsURL = 'https://microsoftedge.microsoft.com/addons/detail/cinfaflgbaachkaamaeglolofeahelkd';

// Webpack: app build, generated output filenames without extension (*.js, *.css)
export const appEntry = "app";
export const serviceWorkerEntry = "background"; // keep in sync with manifest.json
export const contentScriptEntry = "content-script"; // keep in sync with manifest.json
export const pdfViewerEntry = "pdf-viewer";
export const pdfViewerSkipUrlHash = "#pdf-raw";

// Icons, see also: https://fonts.google.com/icons
export const materialIcons = {
  ttsPlay: "play_circle_outline",
  ttsPause: "pause_outline",
  copyTranslation: "content_copy",
  copiedTranslation: "task_alt",
  favorite: "star",
  unfavorite: "star_outline",
  nextTranslation: "arrow_forward",
};

//
// Env-specific data helpers
//
export function getExtensionUrl(): string {
  return isEdge() ? edgeAddonsURL : chromeStoreURL;
}

export function isMac(): boolean {
  return !!navigator.userAgent.match(/AppleWebKit|Macintosh/);
}

export function useCustomPdfViewer(): boolean {
  const isPdf = document.contentType === "application/pdf";
  const skip = new URL(location.href).hash === pdfViewerSkipUrlHash;
  return isPdf && !skip;
}

export function isChrome(): boolean {
  return !!navigator.userAgent.match(/chrome\/(?:\d+\.?)+/i);
}

export function isEdge(): boolean {
  return !!navigator.userAgent.match(/Edge?\//);
}

export function isSystemPage(pageUrl = ""): boolean {
  return !!pageUrl.match(/^(chrome(-extension)?|edge):\/\//i);
}
