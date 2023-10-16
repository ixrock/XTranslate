// Helper for working with persistent storages (e.g. WebStorage API, NodeJS file-system api, etc.)

import { action, IReactionDisposer, makeObservable, observable, reaction, toJS, when } from "mobx";
import { isEqual, isPlainObject, merge } from "lodash";
import { createLogger } from "./createLogger";

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
}

export interface StorageHelperOptions<T> {
  defaultValue?: T;
  autoLoad?: boolean; // preload data immediately, default: true
  autoSync?: boolean; // auto-save changes to remote storage, default: true
  autoSyncDelay?: number; // delay for reaction to save data to external storage
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

  protected disposers = {
    unbindAutoSync: null as IReactionDisposer,
  };

  get whenReady(): Promise<void> {
    return when(() => this.initialized && this.loaded);
  };

  get defaultValue(): T {
    return this.options.defaultValue;
  }

  constructor(readonly key: string, private options: StorageHelperOptions<T>) {
    makeObservable(this);

    // setup default options
    this.options = {
      autoLoad: false,
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

  public bindAutoSync() {
    const { autoSyncDelay } = this.options;

    const bindAutoSync = () => {
      this.disposers.unbindAutoSync?.(); // reset previous
      this.disposers.unbindAutoSync = reaction(() => this.toJS(), state => {
          this.logger.info(`[auto-sync]: saving storage for key "${this.key}"`, {
            state,
            key: this.key,
            hostEnv: location?.href,
          });
          this.save(state);
        },
        autoSyncDelay ? { delay: autoSyncDelay } : {},
      );
    };

    if (autoSyncDelay > 0) {
      this.whenReady.then(bindAutoSync);
    } else {
      bindAutoSync();
    }
  }

  @action
  load({ force = false } = {}) {
    if ((this.loading || this.loaded) && !force) {
      return this.whenReady; // skip if loaded already or in progress
    }

    this.logger.info(`loading "${this.key}"`);

    this.initialized = true;
    this.loading = true;

    try {
      const data = this.storage.getItem(this.key);
      if (data instanceof Promise) {
        return data.then(this.onData, this.onError);
      } else {
        this.onData(data);
      }
    } catch (error) {
      this.logger.error("loading failed", error);
      this.onError(error);
    } finally {
      this.loading = false;
    }

    return this.whenReady;
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
      this.merge(data);
    }

    this.loaded = true;
    this.loading = false;
    this.logger.info("data updated with defaults to:", this.toJS());
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

  @action
  set(value: T, { silent = false } = {}) {
    if (silent && this.options.autoSync) {
      this.disposers?.unbindAutoSync();
      this.data.set(value);
      this.bindAutoSync();
    } else {
      this.data.set(value);
    }
  }

  @action
  reset() {
    this.set(this.defaultValue);
  }

  @action
  merge(update: DeepPartial<T>, { deep = false, silent = false } = {}) {
    let value = this.toJS(); // top-level object or some other data type
    let newValue: T;

    // plain-object merge updates
    if (isPlainObject(value)) {
      if (deep) {
        newValue = merge(value, update);
      } else {
        newValue = Object.assign(value, update);
      }
    }
    // full-rewrite for basic types, arrays and all non-plain objects
    else {
      newValue = update as T;
    }

    this.set(newValue, { silent });
  }

  toJS(): T {
    return toJS(this.get());
  }
}
