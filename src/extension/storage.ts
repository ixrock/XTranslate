// Chrome extension's storage api helper

export class Storage<S> {
  public sync = {
    set(state: S): Promise<S> {
      return new Promise((resolve, reject) => {
        chrome.storage.sync.set(state, function () {
          var error = chrome.runtime.lastError;
          if (error) reject(error);
          else resolve(state);
        });
      });
    },

    get(): Promise<S>{
      return new Promise((resolve, reject) => {
        chrome.storage.sync.get(function (items: S) {
          var error = chrome.runtime.lastError;
          if (error) reject(error);
          else resolve(items);
        });
      });
    }
  };

  public local = {
    get() {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(function (items) {
          var error = chrome.runtime.lastError;
          if (error) reject(error);
          else resolve(items);
        });
      });
    },
    set(items){
      return new Promise((resolve, reject) => {
        chrome.storage.local.set(items, function () {
          var error = chrome.runtime.lastError;
          if (error) reject(error);
          else resolve(items);
        });
      });
    },
    remove(keys: string[]){
      return new Promise((resolve, reject) => {
        chrome.storage.local.remove(keys, function () {
          var error = chrome.runtime.lastError;
          if (error) reject(error);
          else resolve(keys);
        });
      })
    },
    clear(){
      return new Promise((resolve, reject) => {
        chrome.storage.local.clear(function () {
          var error = chrome.runtime.lastError;
          if (error) reject(error);
          else resolve();
        });
      })
    }
  };

  addListener(onChange?: (changes) => void, type = "sync") {
    var listener = function (changes = {}, areaName: "sync"|"local"|"managed") {
      if (type && areaName === type || !type) onChange(changes);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }
}