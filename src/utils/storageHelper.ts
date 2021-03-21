// Helper for working with persistent storages (e.g. WebStorage API, NodeJS file-system api, etc.)

import type { CreateObservableOptions } from "mobx/lib/api/observable";
import { action, comparer, IReactionDisposer, observable, reaction, toJS, when } from "mobx";
import produce, { Draft, enableMapSet, setAutoFreeze } from "immer";
import { isEqual, isPlainObject } from "lodash";
import { isProduction } from "../common";

setAutoFreeze(false); // allow to merge deep observables
enableMapSet(); // allows usage of maps ans sets for produce()

export interface StorageAdapter<T> {
  getItem(key: string): T | Promise<T>;
  setItem(key: string, value: T): void;
  removeItem(key: string): void;
  onChange?(change: { key: string, value: T }): void;
}

export type StorageObservableOptions = CreateObservableOptions;

export interface StorageHelperOptions<T> {
  autoInit?: boolean; // start preloading data immediately, default: true
  defaultValue?: T;
  storage: StorageAdapter<T>;
  observable?: StorageObservableOptions;
}

export class StorageHelper<T> {
  private stopStorageSync?: IReactionDisposer;

  static defaultOptions: Partial<StorageHelperOptions<any>> = {
    autoInit: true,
    observable: {
      deep: true, // deep observable tree
      equals: comparer.shallow,
    }
  };

  @observable private data = observable.box<T>();
  @observable initialized = false;
  whenReady = when(() => this.initialized);

  get storage(): StorageAdapter<T> {
    return this.options.storage;
  }

  get defaultValue(): T {
    return this.options.defaultValue;
  }

  constructor(readonly key: string, private options: StorageHelperOptions<T>) {
    this.options = { ...StorageHelper.defaultOptions, ...options };
    this.configureObservable();
    this.reset();

    if (this.options.autoInit) {
      this.init();
    }
  }

  @action
  init({ force = false } = {}) {
    if (this.initialized && !force) return;

    this.loadFromStorage({
      onData: (data: T) => {
        const notEmpty = data != null;
        const notDefault = !this.isDefault(data);

        if (notEmpty && notDefault) {
          this.set(data);
        }

        this.initialized = true;
      },
      onError: (error?: any) => {
        this.error([`[init]: ${error}`, this]);
      },
    });
  }

  private loadFromStorage(opts: { onData?(data: T): void, onError?(error?: any): void } = {}) {
    let data: T | Promise<T>;

    try {
      data = this.storage.getItem(this.key); // sync reading from storage when exposed

      if (data instanceof Promise) {
        data.then(opts.onData, opts.onError);
      } else {
        opts?.onData(data);
      }
    } catch (error) {
      this.error([`[load]: ${error}`, this]);
      opts?.onError(error);
    }

    return data;
  }

  isEqual(value: T): boolean {
    return isEqual(toJS(this.get()), value);
  }

  isDefault(value: T): boolean {
    return isEqual(this.defaultValue, value);
  }

  @action
  protected configureObservable(options = this.options.observable) {
    this.data = observable.box<T>(this.data.get(), {
      ...StorageHelper.defaultOptions.observable, // inherit default observability options
      ...(options ?? {}),
    });

    this.stopStorageSync?.(); // destroy previous reaction (if any)
    this.stopStorageSync = this.bindAutoSaveOnChange();
  }

  protected bindAutoSaveOnChange({ deep = true, delayMs = 500, autoRun = false } = {}): IReactionDisposer {
    return reaction(() => this.toJS({ deep }), data => this.onDataChange(data), {
      delay: delayMs,
      fireImmediately: autoRun,
    });
  }

  protected onDataChange(value: T) {
    if (!this.initialized) {
      return; // skip
    }
    try {
      this.log([`[change]: ${this.key}`, value]);

      if (value == null) {
        this.storage.removeItem(this.key);
      } else {
        this.storage.setItem(this.key, value);
      }

      this.storage.onChange?.({ value, key: this.key });
    } catch (error) {
      this.error([`[change]: ${error}`, value, this]);
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

  protected error(data: any[]) {
    this.log(data, { isError: true });
  }

  protected log(data: any[], meta: { isError?: boolean } = {}) {
    if (isProduction) {
      return;
    }
    if (meta.isError) {
      console.error(`[storage]:`, ...data);
    } else {
      console.info(`[storage]:`, ...data);
    }
  }

  toJS({ deep = true } = {}) {
    return toJS(this.get(), {
      recurseEverything: deep,
    });
  }
}
