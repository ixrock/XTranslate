// Helper for get/set/remove data from local-storage

type StorageHelper<T> = (value?: T) => T;

export function createStorage<T>(key: string, defaultValue?: T, initDefault?: boolean): StorageHelper<T> {
  var itemManager = function (value?) {
    var clear = value === null;
    // setter
    if (arguments.length && !clear) {
      var item = JSON.stringify(value);
      localStorage.setItem(key, item);
    }
    // getter
    else {
      var item = localStorage.getItem(key);
      if (clear) localStorage.removeItem(key);
      if (item) return JSON.parse(item);
      return defaultValue;
    }
  };
  // save default value if empty to the storage
  if (arguments.length === 3 && initDefault) {
    var value = localStorage.getItem(key);
    if (value == null) itemManager(defaultValue);
  }
  return itemManager;
}

export default createStorage;