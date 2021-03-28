// Helper for working with persistent storages (e.g. WebStorage API, NodeJS file-system api, etc.)

import type { CreateObservableOptions } from "mobx/lib/api/observable";
import { action, comparer, observable, reaction, toJS, when } from "mobx";
import produce, { Draft, enableMapSet, setAutoFreeze } from "immer";
import { isEqual, isPlainObject } from "lodash";
import { createLogger } from "./createLogger";

setAutoFreeze(false); // allow to merge deep observables
enableMapSet(); // allow usage of maps ans sets

export interface StorageAdapter<T> {
  getItem(key: string): T | Promise<T>;
  setItem(key: string, value: T): void;
  removeItem(key: string): void;
  onChange?(change: { key: string, value: T }): void;
}

export type StorageObservableOptions = CreateObservableOptions;
export type StorageMigrationCallback<T> = (data: T | any) => T;

export interface StorageHelperOptions<T> {
  autoInit?: boolean; // start preloading data immediately, default: true
  autoSave?: boolean; // auto-save data-changes to underlying storage, default: true
  defaultValue?: T;
  storage: StorageAdapter<T>;
  observable?: StorageObservableOptions;
  migrations?: StorageMigrationCallback<T>[]; // handle storage model upgrades
}

export class StorageHelper<T> {
  static defaultLogger = createLogger({ systemPrefix: "[STORAGE]" });
  private logger = StorageHelper.defaultLogger;

  static defaultOptions: Partial<StorageHelperOptions<any>> = {
    autoInit: true,
    autoSave: true,
    observable: {
      deep: true,
      equals: comparer.shallow,
    },
  };

  @observable private data = observable.box<T>();
  @observable initialized = false;
  @observable loading = false;
  @observable loaded = false;
  whenReady = when(() => this.initialized && this.loaded);

  get storage(): StorageAdapter<T> {
    return this.options.storage;
  }

  get defaultValue(): T {
    return this.options.defaultValue;
  }

  constructor(readonly key: string, private options: StorageHelperOptions<T>) {
    this.options = { ...StorageHelper.defaultOptions, ...options };
    this.options.observable = { ...StorageHelper.defaultOptions.observable, ...this.options.observable };
    this.reset();

    if (this.options.autoInit) {
      this.init();
    }
  }

  @action
  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.load();

    this.onChange(value => {
      if (!this.loaded) return;

      this.logger.info(`data changed for "${this.key}"`, value);
      if (this.options.autoSave) {
        this.saveToStorage(value);
      }
      if (this.storage.onChange) {
        this.storage.onChange({ value, key: this.key });
      }
    });
  }

  @action
  load() {
    this.loading = true;

    this.loadFromStorage({
      onData: (data: T) => {
        const notEmpty = data != null;
        if (notEmpty) {
          if (this.options.migrations) {
            data = this.options.migrations.reduce((data, migrate) => migrate(data), data);
          }
          if (!this.isDefault(data)) {
            this.set(data);
          }
        }
        this.loaded = true;
        this.loading = false;
      },
      onError: (error?: any) => {
        this.loading = false;
        this.logger.error(`[init]: ${error}`, this);
      },
    });
  }

  saveToStorage(value: T) {
    if (value == null) {
      this.storage.removeItem(this.key);
    } else {
      this.storage.setItem(this.key, value);
    }
  }

  loadFromStorage(opts: { onData?(data: T): void, onError?(error?: any): void } = {}) {
    try {
      const data = this.storage.getItem(this.key);
      if (data instanceof Promise) {
        data.then(opts.onData, opts.onError);
      } else {
        opts?.onData(data);
      }
      return data;
    } catch (error) {
      this.logger.error(`[load]: ${error}`, this);
      opts?.onError(error);
    }
  }

  isEqual(value: T): boolean {
    return isEqual(this.get(), value);
  }

  isDefault(value: T): boolean {
    return isEqual(this.defaultValue, value);
  }

  public onChange(callback: (value: T) => void, { deep, ...options } = this.options.observable) {
    return reaction(() => this.toJS({ deep }), callback, options);
  }

  get(): T {
    return this.data.get();
  }

  set(value: T) {
    this.data.set(value);
  }

  reset() {
    this.set(this.defaultValue);
  }

  clear() {
    this.data.set(null);
  }

  merge(value: Partial<T> | ((draft: Draft<T>) => Partial<T> | void)) {
    const nextValue = produce(this.get(), (state: Draft<T>) => {
      const newValue = typeof value === "function" ? value(state) : value;

      return isPlainObject(newValue)
        ? Object.assign(state, newValue) // partial updates for returned plain objects
        : newValue;
    });

    this.set(nextValue as T);
  }

  toJS({ deep = true } = {}) {
    return toJS(this.get(), {
      recurseEverything: deep,
    });
  }
}
