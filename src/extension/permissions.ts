// Chrome extension permissions apis

export enum Permission {
  Tabs = "tabs", // manifest.json -> optional_permissions
  ContextMenus = "contextMenus",
}

export async function requestPermissions(permissions: Permission[], origins?: string[]): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.request({ permissions, origins }, granted => {
      var error = chrome.runtime.lastError;
      if (error) reject(error)
      else resolve(granted);
    });
  })
}

export function onPermissionActivated(requestingPermissions: Permission[], callback: () => void | Function) {
  chrome.permissions.contains({ permissions: requestingPermissions }, active => {
    var callbackTeardown: any;
    if (active) activate();
    chrome.permissions.onAdded.addListener(onPermissionsChange);
    chrome.permissions.onRemoved.addListener(onPermissionsChange);

    function activate() {
      if (callbackTeardown) return; // don't activate multiple times
      callbackTeardown = callback();
    }

    async function deactivate() {
      if (!callbackTeardown) return; // no teardown callback provided
      callbackTeardown();
      callbackTeardown = null;
    }

    function onPermissionsChange() {
      chrome.permissions.getAll(({ permissions }) => {
        var active = requestingPermissions.every(p => permissions.includes(p));
        if (active) activate();
        else deactivate();
      })
    }
  })
}
