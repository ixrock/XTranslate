import { action, observable, reaction, runInAction, toJS, when } from "mobx";
import { autobind } from "./utils/autobind";
import isEqual from "lodash/isEqual";
import { logger } from "./logger";

export interface StoreParams<T = object> {
  id: string;
  initialData?: T;
  storageType?: "sync" | "local"
  autoLoad?: boolean;
  syncDelayMs?: number;
}

@autobind()
export abstract class Store<T = object> {
  static defaultParams: Partial<StoreParams> = {
    initialData: {},
    autoLoad: true,
    syncDelayMs: 250,
    storageType: "local",
  };

  @observable isLoading = false;
  @observable isLoaded = false;
  @observable data: T;

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
    var { initialData, autoLoad, storageType } = this.params;
    this.data = initialData;

    if (autoLoad) {
      this.load();
    }

    // sync data state with chrome.storage on change
    when(() => this.isLoaded, () => {
      reaction(() => toJS(this.data), this.save, {
        delay: this.params.syncDelayMs
      });
    });

    // sync data from chrome.storage (options page <-> background process <-> content script)
    chrome.storage.onChanged.addListener((changes, areaName) => {
      var isCurrentStore = areaName === storageType && changes[this.id];
      if (!isCurrentStore || !this.isLoaded || this.isLoading) return;
      var { newValue, oldValue } = changes[this.id];
      if (!isEqual(newValue, toJS(this.data))) {
        logger.debug(`Sync "${this.id}" from chrome.storage`, changes);
        this.update(newValue);
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
    var storageData = { [this.id]: data };
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
