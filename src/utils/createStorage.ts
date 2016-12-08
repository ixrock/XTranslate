// Helper for get/set/remove data from local-storage

type StorageHelper<T> = (value?: T) => T;

export function createStorage<T>(key: string, defaultValue?: T): StorageHelper<T> {
  return function (value?) {
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
}

export default createStorage;