// Helper for working with persistent storages (e.g. WebStorage API, NodeJS file-system api, etc.)

import { action, IReactionDisposer, IReactionOptions, makeObservable, observable, reaction, toJS, when } from "mobx";
import produce, { Draft } from "immer";
import { isEqual, isPlainObject, merge } from "lodash";
import { createLogger } from "./createLogger";

export interface StorageHelperOptions<T> {
  defaultValue?: T;
  autoLoad?: boolean; // preload data immediately, default: true
  autoSync?: boolean | IReactionOptions; // auto-save changes to remote storage, default: true
  migrations?: StorageMigrationCallback<T>[]; // handle model upgrades during app's lifetime
  storage: StorageAdapter<T>;
}

export type StorageMigrationCallback<T> = (data: T | any) => T | void;

export interface StorageAdapter<T> {
  getItem(key: string): T | Promise<T>;
  setItem(key: string, value: T): void;
  removeItem(key: string): void;
}

export class StorageHelper<T> {
  protected logger = createLogger({ systemPrefix: `[StorageHelper](${this.key})` });
  protected storage: StorageAdapter<T> = this.options.storage;
  protected data = observable.box<T>();

  @observable initialized = false;
  @observable saving = false;
  @observable loading = false;
  @observable loaded = false;
  @observable.ref unbindAutoSync?: IReactionDisposer;

  get whenReady() {
    return when(() => this.initialized && this.loaded);
  };

  get defaultValue(): T {
    return this.options.defaultValue;
  }

  constructor(readonly key: string, private options: StorageHelperOptions<T>) {
    makeObservable(this);

    // setup default options
    this.options = {
      autoLoad: true,
      autoSync: true,
      ...options
    };
    this.data.set(this.defaultValue);

    if (this.options.autoLoad) {
      this.load();
    }
    if (this.options.autoSync) {
      this.bindAutoSync();
    }
  }

  public bindAutoSync(opts: IReactionOptions = {}) {
    const { autoSync } = this.options;
    const syncOptions: IReactionOptions = typeof autoSync === "boolean" ? {} : autoSync;
    Object.assign(syncOptions, opts);

    const bindAutoSync = () => {
      this.unbindAutoSync?.(); // reset previous
      this.unbindAutoSync = reaction(() => this.toJS(), state => this.save(state), syncOptions);
    };

    if (syncOptions.delay > 0) {
      this.whenReady.then(bindAutoSync);
    } else {
      bindAutoSync();
    }
  }

  @action
  load({ force = false } = {}) {
    if (this.initialized && !force) return;
    this.initialized = true;
    try {
      this.loading = true;
      const data = this.storage.getItem(this.key);
      if (data instanceof Promise) data.then(this.onData, this.onError);
      else this.onData(data);
    } catch (error) {
      this.logger.error("loading failed", error);
      this.onError(error);
    } finally {
      this.loading = false;
    }
  }

  @action
  protected save(data: T) {
    try {
      this.logger.info("saving data to external storage", data);
      this.saving = true;
      this.storage.setItem(this.key, data);
    } catch (error) {
      this.logger.error("saving data has failed", error);
    } finally {
      this.saving = false;
    }
  }

  @action
  protected onData = (data: T) => {
    this.logger.info("data received", data);
    const notEmpty = data != null;
    if (notEmpty) {
      for (let callback of this.options.migrations ?? []) {
        let migratedData = callback(data);
        if (migratedData !== undefined) data = migratedData as T;
      }
      if (!this.isDefaultValue(data)) {
        this.set(data);
      }
    }
    this.loaded = true;
    this.loading = false;
  };

  @action
  protected onError = (error?: any) => {
    this.loading = false;
    this.logger.error("loading failed", error, this);
  };

  isDefaultValue(value: T): boolean {
    return isEqual(this.defaultValue, value);
  }

  get(): T {
    return this.data.get();
  }

  set(value: T, { silent = false } = {}) {
    if (silent && this.options.autoSync) {
      this.unbindAutoSync();
      this.data.set(value);
      this.bindAutoSync();
    } else {
      this.data.set(value);
    }
  }

  reset() {
    this.set(this.defaultValue);
  }

  merge(value: Partial<T> | ((draft: Draft<T>) => Partial<T> | void)) {
    const nextValue = produce(this.toJS(), (state: Draft<T>) => {
      const newValue = typeof value === "function" ? value(state) : value;

      return isPlainObject(newValue)
        ? merge(state, newValue) as any // partial updates for plain objects
        : newValue;
    });

    return this.set(nextValue as T);
  }

  toJS() {
    return toJS(this.get());
  }
}
