import { action, observable, reaction, runInAction, toJS, when } from "mobx";
import { autobind } from "./utils/autobind";
import { logger } from "./logger";
import { isEqual } from "lodash";

// todo: add revision number for better changes detection

export interface StoreParams<T = object> {
  id: string;
  initialData?: T;
  storageType?: "sync" | "local"
  autoLoad?: boolean;
  autoSave?: boolean;
  autoSaveDelayMs?: number;
}

@autobind()
export abstract class Store<T = object> {
  static defaultParams: Partial<StoreParams> = {
    initialData: {},
    autoLoad: true,
    autoSave: true,
    autoSaveDelayMs: 250,
    storageType: "local",
  };

  @observable.shallow data: T;
  @observable isLoading = false;
  @observable isLoaded = false;

  get id() {
    return this.params.id;
  }

  get params() {
    return Object.assign({}, Store.defaultParams, this.initialParams);
  }

  protected get storage() {
    return chrome.storage[this.params.storageType];
  }

  protected constructor(protected initialParams: StoreParams<T>) {
    var { initialData, autoLoad, storageType, autoSave, autoSaveDelayMs } = this.params;
    this.data = initialData;

    if (autoLoad) {
      this.load();
    }

    // auto-sync data with chrome.storage on change
    if (autoSave) {
      when(() => this.isLoaded, () => {
        reaction(() => toJS(this.data), this.save, {
          delay: autoSaveDelayMs
        });
      });
    }

    // sync data from chrome.storage
    chrome.storage.onChanged.addListener((changes, areaName) => {
      var isCurrentStore = areaName === storageType && changes[this.id];
      if (!isCurrentStore || this.isLoading) return;
      var data = changes[this.id].newValue;
      if (!isEqual(data, toJS(this.data))) {
        runInAction(() => {
          logger.debug(`Sync "${this.id}" from chrome.storage`, changes);
          this.update(data);
          this.isLoaded = true;
        })
      }
    });
  }

  @action
  async load(): Promise<T> {
    if (this.isLoaded || this.isLoading) {
      return;
    }
    logger.debug(`Loading store "${this.id}"`);
    this.isLoading = true;
    return new Promise((resolve, reject) => {
      this.storage.get(this.id, items => {
        var error = chrome.runtime.lastError;
        if (error) {
          logger.error(`Loading error`, error, this);
          reject(error);
        }
        else {
          logger.debug(`Loaded store "${this.id}"`, items);
          resolve();
        }
        runInAction(() => {
          this.update(items[this.id]);
          this.isLoaded = true;
          this.isLoading = false;
        })
      });
    })
  }

  @action
  async save(data: T = this.data) {
    var storageData = { [this.id]: toJS(data) };
    logger.debug(`Saving store`, storageData)
    return new Promise(async (resolve, reject) => {
      this.storage.set(storageData, () => {
        var error = chrome.runtime.lastError;
        if (error) {
          logger.error(`Saving error`, error, this);
          reject(error);
        }
        else resolve();
      });
    })
  }

  @action
  update(data: T) {
    if (!data) return;
    this.data = data;
  }

  @action
  reset() {
    this.update(this.params.initialData);
  }
}
