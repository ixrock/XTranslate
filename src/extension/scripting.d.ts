// Missing types for "@types/chrome" package
// Docs: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting

declare namespace chrome.scripting {
  export var registerContentScripts: (scripts: RegisteredContentScript[]) => Promise<any>;

  export interface RegisteredContentScript {
    id: string;
    allFrames?: boolean;
    css?: string[];
    js?: string[];
    matches?: string[];
    excludeMatches?: string[];
    persistAcrossSessions?: boolean;
    runAt?: "document_start" | "document_end" | "document_idle";
  }
}
