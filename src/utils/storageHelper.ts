// Helper for working with persistent storages (e.g. WebStorage API, NodeJS file-system api, etc.)

import { action, IReactionDisposer, makeObservable, observable, reaction, toJS, when, IReactionOptions } from "mobx";
import { isEqual, isPlainObject, merge, noop } from "lodash";
import { createLogger } from "./createLogger";

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
}

export interface StorageHelperOptions<T> {
  defaultValue?: T;
  autoLoad?: boolean; // preload data from persistent storage when `opts.storageProvider` (default: true)
  migrations?: StorageMigrationCallback<T>[]; // handle model upgrades during app's lifetime
  storageAdapter?: StorageAdapter<T>; // handle saving and loading state from external storage
  autoSaveOptions?: IReactionOptions<T, boolean>;
}

export type StorageMigrationCallback<T> = (data: T | any) => T | void;

export interface StorageAdapter<T> {
  getItem(key: string): Promise<T> | T;
  setItem(key: string, value: T): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

export class StorageHelper<T> {
  static getResourceOrigin() {
    return globalThis.location?.href;
  }

  protected logger = createLogger({ systemPrefix: `[StorageHelper](${this.key})` });
  protected storage?: StorageAdapter<T> = this.options.storageAdapter;
  protected data = observable.box<T>();
  @observable initialized = false;
  @observable saving = false;
  @observable loading = false;
  @observable loaded = false;

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
      autoLoad: true,
      ...options
    };
    this.data.set(this.defaultValue);

    if (this.options.autoLoad) {
      this.load();
    }
  }

  public unbindAutoSaveToExternalStorage: IReactionDisposer | Function = noop;

  public bindAutoSaveToExternalStorage() {
    if (!this.options.storageAdapter) return;

    this.unbindAutoSaveToExternalStorage?.(); // stop previous if any

    this.unbindAutoSaveToExternalStorage = reaction(() => this.toJS(), (state) => {
        this.saveToExternalStorage(state).catch(this.logger.error);
      }, this.options.autoSaveOptions,
    );
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
      const data = this.storage?.getItem(this.key) ?? this.defaultValue
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

  @action.bound
  protected async saveToExternalStorage(state: T) {
    try {
      this.logger.info(`saving state to external storage"`, {
        state,
        key: this.key,
        origin: location?.href,
      });
      this.saving = true;
      await this.storage?.setItem(this.key, state);
    } catch (error) {
      this.logger.error("saving state to external storage has failed", error);
    } finally {
      this.saving = false;
    }
  }

  @action.bound
  protected onData(data: T) {
    this.logger.info("data fetched", {
      data,
      origin: StorageHelper.getResourceOrigin(),
    });

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
    this.bindAutoSaveToExternalStorage();
  };

  @action.bound
  protected onError(error?: any) {
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
    if (silent) {
      this.unbindAutoSaveToExternalStorage?.();
    }
    this.data.set(value);
    if (silent) {
      this.bindAutoSaveToExternalStorage();
    }
  }

  @action
  reset(opts?: { silent?: boolean }) {
    this.set(this.defaultValue, opts);
  }

  @action
  merge(update: DeepPartial<T>, { deep, silent }: { deep?: boolean, silent?: boolean } = {}) {
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
