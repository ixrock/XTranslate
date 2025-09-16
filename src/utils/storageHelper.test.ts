import { reaction } from "mobx";
import { StorageAdapter, StorageHelper } from "./storageHelper";

describe("renderer/utils/StorageHelper", () => {
  describe("Using custom StorageAdapter", () => {
    const storageKey = "mySettings";
    const storageMock: Record<string, any> = {
      [storageKey]: undefined,
    };
    const defaultValue = {
      message: "hello-world",
      deepDataTree: {
        other: "stuff",
        some: "thing",
      }
    };

    type StorageModel = Partial<typeof defaultValue>;
    let storageHelper: StorageHelper<StorageModel>;
    let storageAdapter: StorageAdapter<StorageModel>;

    beforeEach(() => {
      storageAdapter = {
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
        autoLoad: false,
        defaultValue: defaultValue,
        storageAdapter: storageAdapter,
      });
    });

    it("loads data from storage with fallback to default-value", () => {
      expect(storageHelper.get()).toEqual(defaultValue);
      storageHelper.load();

      expect(storageHelper.get().message).toBe("saved-before");
      expect(storageAdapter.getItem).toHaveBeenCalledWith(storageHelper.key);
    });

    it("load() data from external storage", async () => {
      expect(storageHelper.initialized).toBeFalsy();
      await storageHelper.load();
      expect(storageHelper.loaded).toBeTruthy();
      expect(storageHelper.get().message).toBe("saved-before");
    });

    it("set() fully replaces data in storage", async () => {
      await storageHelper.load();
      storageHelper.set({ message: "test2" });
      expect(storageHelper.get()).toEqual({ message: "test2" });
      expect(storageMock[storageKey]).toEqual({ message: "test2" });
    });

    it("merge() allows deep updates for plain objects", () => {
      expect(storageHelper.get()).toEqual(defaultValue);
      storageHelper.load();

      storageHelper.merge({
        message: "updated",
        deepDataTree: {
          some: "blabla",
        },
      }, {
        deep: true,
      });

      expect(storageHelper.get()).toEqual({
        ...defaultValue,
        message: "updated",
        deepDataTree: {
          some: "blabla",
          other: "stuff",
        }
      });
    });

    it("merge() by default re-assign keys for object data types", () => {
      expect(storageHelper.get()).toEqual(defaultValue);
      storageHelper.load();

      storageHelper.merge({
        deepDataTree: { some: "1" },
      });

      expect(storageHelper.get()).toEqual({
        message: "saved-before",
        deepDataTree: { some: "1" },
      } as StorageModel);
    });
  });

  describe("data in storage-helper is observable (mobx)", () => {
    let storageHelper: StorageHelper<any>;
    const defaultValue: any = { firstName: "Joe" };
    const observedChanges: any[] = [];

    beforeEach(() => {
      observedChanges.length = 0;

      storageHelper = new StorageHelper<typeof defaultValue>("some-key", {
        autoLoad: true,
        defaultValue,
        storageAdapter: {
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

  it("opts.deepMergeOnLoad: true produces deep merge on load", async () => {
    const storageKey = "testDeepMergeTrue";
    const storageAdapter = {
      getItem: jest.fn(() => ({
        message: "updated",
        deepDataTree: { some: "changed" },
      })),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };

    const defaultValue = {
      message: "default",
      deepDataTree: { other: "defaultOther" },
    };

    const storageHelper = new StorageHelper(storageKey, {
      autoLoad: false,
      deepMergeOnLoad: true,
      defaultValue,
      storageAdapter,
    });

    await storageHelper.load();
    expect(storageHelper.get()).toEqual({
      message: "updated",
      deepDataTree: { some: "changed", other: "defaultOther" },
    });
  });

  it("opts.deepMergeOnLoad: false performs shallow merge on load", async () => {
    const storageKey = "testDeepMergeFalse";
    const storageAdapter = {
      getItem: jest.fn(() => ({
        message: "updated",
        deepDataTree: { some: "changed" },
      })),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };

    const defaultValue = {
      message: "default",
      deepDataTree: { some: "default", other: "defaultOther" },
    };

    const storageHelper = new StorageHelper(storageKey, {
      autoLoad: false,
      deepMergeOnLoad: false,
      defaultValue,
      storageAdapter,
    });

    await storageHelper.load();
    expect(storageHelper.get()).toEqual({
      message: "updated",
      deepDataTree: { some: "changed" },
    });
  });

  it("opts.saveDefaultWhenEmpty: saves default to storage if loaded data is empty", async () => {
    const storageKey = "testSaveDefault";
    const setItemMock = jest.fn();
    const storageAdapter = {
      getItem: jest.fn(),
      setItem: setItemMock,
      removeItem: jest.fn(),
    };

    const defaultValue = { message: "default" };

    const storageHelper = new StorageHelper(storageKey, {
      autoLoad: false,
      saveDefaultWhenEmpty: true,
      defaultValue,
      storageAdapter,
    });

    await storageHelper.load();
    expect(setItemMock).toHaveBeenCalledWith(storageKey, defaultValue);
  });

});
