import { reaction } from "mobx";
import { StorageAdapter, StorageHelper } from "./storageHelper";
import { delay } from "./delay";

describe("renderer/utils/StorageHelper", () => {
  describe("window.localStorage might be used as StorageAdapter", () => {
    type StorageModel = string;

    const storageKey = "ui-settings";
    let storageHelper: StorageHelper<StorageModel>;

    beforeEach(() => {
      localStorage.clear();

      storageHelper = new StorageHelper<StorageModel>(storageKey, {
        autoInit: false,
        storage: localStorage,
        defaultValue: "test",
      });
    });

    it("initialized with default value", async () => {
      localStorage.setItem(storageKey, "saved"); // pretending it was saved previously

      expect(storageHelper.key).toBe(storageKey);
      expect(storageHelper.defaultValue).toBe("test");
      expect(storageHelper.get()).toBe("test");

      await storageHelper.init();

      expect(storageHelper.key).toBe(storageKey);
      expect(storageHelper.defaultValue).toBe("test");
      expect(storageHelper.get()).toBe("saved");
    });

    it("updates storage", async () => {
      storageHelper.init();

      storageHelper.set("test2");
      expect(localStorage.getItem(storageKey)).toBe("test2");

      localStorage.setItem(storageKey, "test3");
      storageHelper.load(); // reload from underlying storage and merge
      expect(storageHelper.get()).toBe("test3");
    });
  });

  describe("Using custom StorageAdapter", () => {
    const storageKey = "mySettings";
    const storageMock = {
      [storageKey]: undefined,
    };

    type StorageModel = typeof defaultValue;
    let storageHelper: StorageHelper<StorageModel>;
    let storageHelperAsync: StorageHelper<StorageModel>;
    let storageAdapter: StorageAdapter<StorageModel>;

    const defaultValue = {
      message: "hello-world",
      deepDataTree: {
        other: "stuff",
        some: "thing",
      }
    };

    beforeEach(() => {
      storageAdapter = {
        onChange: jest.fn(),
        getItem: jest.fn((key: string) => {
          return {
            ...defaultValue,
            message: "saved-before",
          };
        }),
        setItem: jest.fn((key: string, value: any) => {
          storageMock[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete storageMock[key];
        }),
      };

      storageHelper = new StorageHelper(storageKey, {
        autoInit: false,
        defaultValue: defaultValue,
        storage: storageAdapter,
      });

      storageHelperAsync = new StorageHelper(storageKey, {
        autoInit: false,
        defaultValue: defaultValue,
        storage: {
          ...storageAdapter,
          async getItem(key: string): Promise<typeof defaultValue | any> {
            await delay(500); // fake loading timeout

            return storageAdapter.getItem(key);
          }
        },
      });
    });

    it("loads data from storage with fallback to default-value", () => {
      expect(storageHelper.get()).toEqual(defaultValue);
      storageHelper.init();

      expect(storageHelper.get().message).toBe("saved-before");
      expect(storageAdapter.getItem).toHaveBeenCalledWith(storageHelper.key);
    });

    it("async loading from storage supported too", async () => {
      expect(storageHelperAsync.initialized).toBeFalsy();
      storageHelperAsync.init();
      await delay(300);
      expect(storageHelperAsync.loaded).toBeFalsy();
      expect(storageHelperAsync.get()).toEqual(defaultValue);
      await delay(200);
      expect(storageHelperAsync.loaded).toBeTruthy();
      expect(storageHelperAsync.get().message).toBe("saved-before");
    });

    it("set() fully replaces data in storage", () => {
      storageHelper.init();
      storageHelper.set({ message: "test2" } as any);
      expect(storageHelper.get()).toEqual({ message: "test2" });
      expect(storageMock[storageKey]).toEqual({ message: "test2" });
    });

    it("merge() does partial data tree updates", () => {
      expect(storageHelper.get()).toEqual(defaultValue);
      storageHelper.init();
      storageHelper.merge({ message: "updated" });

      expect(storageHelper.get()).toEqual({ ...defaultValue, message: "updated" });
      expect(storageAdapter.setItem).toHaveBeenCalledWith(storageHelper.key, { ...defaultValue, message: "updated" });

      // deep store updates
      storageHelper.merge(draft => {
        draft.deepDataTree.some = "blabla";
      });
      expect(storageHelper.get()).toEqual({
        message: "updated",
        deepDataTree: {
          ...defaultValue.deepDataTree,
          some: "blabla",
        }
      });

      // allows to get access to current state before merge
      storageHelper.merge(({ message }) => ({
        message: Array(2).fill(message).join("-"),
      }));
      expect(storageHelper.get().message).toEqual("updated-updated");
    });

    it("clears data in storage", () => {
      storageHelper.init();

      expect(storageHelper.get()).toBeTruthy();
      storageHelper.clear();
      expect(storageHelper.get()).toBeFalsy();
      expect(storageMock[storageKey]).toBeUndefined();
      expect(storageAdapter.removeItem).toHaveBeenCalledWith(storageHelper.key);
    });

  });

  describe("data in storage-helper is observable (mobx)", () => {
    let storageHelper: StorageHelper<any>;
    const defaultValue: any = { firstName: "Joe" };
    const observedChanges: any[] = [];

    beforeEach(() => {
      observedChanges.length = 0;

      storageHelper = new StorageHelper<typeof defaultValue>("some-key", {
        autoInit: true,
        defaultValue,
        storage: {
          getItem: jest.fn(),
          setItem: jest.fn(),
          removeItem: jest.fn(),
        },
      });
    });

    it("storage.get() is observable", () => {
      expect(storageHelper.get()).toEqual(defaultValue);

      reaction(() => storageHelper.toJS(), change => {
        observedChanges.push(change);
      });

      storageHelper.merge({ lastName: "Black" });
      storageHelper.set("whatever");
      storageHelper.set(["other-data", 123]);

      expect(observedChanges[0]).toEqual({ ...defaultValue, lastName: "Black" });
      expect(observedChanges[2][0]).toBe("other-data");
    });
  });

});
