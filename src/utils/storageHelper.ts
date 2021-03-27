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

export interface StorageHelperOptions<T> {
  autoInit?: boolean; // start preloading data immediately, default: true
  autoSave?: boolean; // auto-save data-changes to underlying storage, default: true
  defaultValue?: T;
  storage: StorageAdapter<T>;
  observable?: StorageObservableOptions;
}

export interface StorageHelperPreloadOptions<T> {
  // customize data import on first loading, useful for updating storage with a new model type
  migrate?: (data: T) => T;
}

export class StorageHelper<T> {
  static defaultLogger = createLogger({ systemPrefix: "[STORAGE]" });
  private logger = StorageHelper.defaultLogger;

  static defaultOptions: Partial<StorageHelperOptions<any>> = {
    autoInit: true,
    autoSave: true,
    observable: {
      deep: true, // deep observable tree
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
  init(opts?: StorageHelperPreloadOptions<T>) {
    if (this.initialized) return;
    this.initialized = true;
    this.load(opts);
  }

  @action
  load({ migrate }: StorageHelperPreloadOptions<T> = {}) {
    this.loading = true;

    this.loadFromStorage({
      onData: (data: T) => {
        const notEmpty = data != null;
        const notDefault = !this.isDefault(data);

        if (notEmpty && notDefault) {
          if (migrate) data = migrate(data);
          this.set(data);
        }

        this.loaded = true;
        this.loading = false;
        this.onChange(value => this.onDataChange(value));
      },
      onError: (error?: any) => {
        this.loading = false;
        this.logger.error(`[init]: ${error}`, this);
      },
    });
  }

  protected loadFromStorage(opts: { onData?(data: T): void, onError?(error?: any): void } = {}) {
    let data: T | Promise<T>;

    try {
      data = this.storage.getItem(this.key); // sync reading from storage when exposed

      if (data instanceof Promise) {
        data.then(opts.onData, opts.onError);
      } else {
        opts?.onData(data);
      }
    } catch (error) {
      this.logger.error(`[load]: ${error}`, this);
      opts?.onError(error);
    }

    return data;
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

  private onDataChange(value: T) {
    if (!this.loaded) return; // skip

    try {
      this.logger.info(`data changed for "${this.key}"`, value);

      if (this.options.autoSave) {
        if (value == null) {
          this.storage.removeItem(this.key);
        } else {
          this.storage.setItem(this.key, value);
        }
      }

      this.storage.onChange?.({ value, key: this.key });
    } catch (error) {
      this.logger.error(`changed ${error}`, value, this);
    }
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
