import { action, observable, reaction, runInAction, toJS, when } from "mobx";
import { autobind } from "./utils/autobind";
import { logger } from "./logger";

export interface SerializedStore<T = object> {
  version: number;
  data: T;
}

export interface StoreParams<T extends object = {}> {
  id: string;
  initialData?: T;
  storageType?: "sync" | "local"
  autoLoad?: boolean;
  autoSave?: boolean;
  autoSaveDelayMs?: number;
}

@autobind()
export abstract class Store<T extends object> implements Iterable<[string | keyof T, any]> {
  static defaultParams: Partial<StoreParams> = {
    initialData: {},
    autoLoad: true,
    autoSave: true,
    autoSaveDelayMs: 250,
    storageType: "local",
  };

  @observable.shallow data: T;
  @observable version = 1;
  @observable isLoading = false;
  @observable isLoaded = false;

  get id() {
    return this.params.id;
  }

  protected get storage() {
    return chrome.storage[this.params.storageType];
  }

  protected constructor(public params: StoreParams<T>) {
    this.params = Object.assign({}, Store.defaultParams, params);
    var { initialData, autoLoad, storageType, autoSave } = this.params;
    this.data = initialData;

    if (autoLoad) this.load();
    if (autoSave) this.enableAutoSave();

    // sync data from chrome.storage
    chrome.storage.onChanged.addListener((changes, areaName) => {
      var isCurrentStore = areaName === storageType && changes[this.id];
      if (!isCurrentStore || !this.isLoaded) return;
      var { newValue, oldValue } = changes[this.id];
      if (oldValue && !newValue) this.onReset();
      else this.onData(newValue);
    });
  }

  @action
  async load(): Promise<void> {
    if (this.isLoaded || this.isLoading) {
      return;
    }
    logger.debug(`Loading store "${this.id}"`);
    this.isLoading = true;
    return new Promise((resolve, reject) => {
      this.storage.get(this.id, items => {
        this.isLoading = false;
        var error = chrome.runtime.lastError;
        if (error) {
          logger.error(`Loading error`, error, this);
          reject(error);
        }
        else {
          var data = items[this.id];
          logger.debug(`Loaded store "${this.id}"`, { data });
          this.onData(data);
          this.isLoaded = true;
          resolve();
        }
      });
    })
  }

  public disableAutoSave = new Function;

  async enableAutoSave() {
    await when(() => this.isLoaded);
    if (this.disableAutoSave) {
      this.disableAutoSave();
    }
    this.disableAutoSave = reaction(() => toJS(this.data), this.save, {
      delay: this.params.autoSaveDelayMs,
    });
  }

  @action
  async save() {
    var data = this.toJSON();
    data.version = ++this.version;
    logger.debug(`Saving store "${this.id}"`, data);
    return new Promise(async (resolve, reject) => {
      this.storage.set({ [this.id]: data }, () => {
        var error = chrome.runtime.lastError;
        if (error) {
          logger.error(`Saving error`, error, this);
          this.version--;
          reject(error);
        }
        else {
          resolve();
        }
      });
    })
  }

  protected applyWithoutAutoSave(callback: () => void) {
    if (this.params.autoSave) {
      this.disableAutoSave();
    }
    runInAction(callback);
    if (this.params.autoSave) {
      this.enableAutoSave();
    }
  }

  @action
  protected onData(rawData: SerializedStore<T> | T | any) {
    var { version, data } = this.parseJSON(rawData);
    if (version > this.version) {
      logger.debug(`Sync "${this.id}" from chrome.storage`, {
        data: data,
        newVersion: version,
        oldVersion: this.version
      })
      this.applyWithoutAutoSave(() => {
        this.version = version;
        this.data = data;
      })
    }
  }

  protected onReset() {
    this.applyWithoutAutoSave(() => {
      logger.debug(`Reset store "${this.id}"`);
      var data = this.params.initialData;
      this.version = 1;
      this.data = data;
    })
  }

  reset() {
    this.storage.remove(this.id);
  }

  protected parseJSON(rawData: SerializedStore<T> | T | any): SerializedStore<T> {
    var data: SerializedStore<T> = rawData;
    if (!data) {
      return this.toJSON();
    }
    if (!data.version) {
      return {
        version: this.version + 1,
        data: rawData,
      }
    }
    return data;
  }

  toJSON(): SerializedStore<T> {
    return {
      version: this.version,
      data: toJS(this.data),
    };
  }

  * [Symbol.iterator]() {
    yield* Object.entries(this.data);
  }
}
