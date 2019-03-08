import { observable, reaction, toJS, when } from "mobx";
import { autobind } from "./utils/autobind";
import isEqual from "lodash/isEqual";

export interface StoreParams<T = object> {
  initialData: T;
  storageType?: "sync" | "local"
  autoLoad?: boolean;
  autoSave?: boolean;
  autoSaveDelayMs?: number;
}

@autobind()
export abstract class Store<T = object> {
  protected abstract id: string;

  static defaultParams: Partial<StoreParams> = {
    autoLoad: true,
    autoSave: true,
    autoSaveDelayMs: 250,
    storageType: "local",
  };

  @observable isLoading = false;
  @observable isLoaded = false;
  @observable isSaving = false;
  @observable data: T;

  protected constructor(protected params: StoreParams<T>) {
    this.params = Object.assign({}, Store.defaultParams, params);

    var { initialData, autoLoad, autoSave, autoSaveDelayMs, storageType } = this.params;
    this.data = initialData;

    if (autoLoad) {
      this.load();
    }
    if (autoSave) {
      when(() => this.isLoaded, this.bindAutoSave);
    }
    // sync storage changes made from options page (for background & content pages)
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (this.isSaving) return;
      if (areaName === storageType && changes[this.id]) {
        var newData = changes[this.id].newValue;
        if (isEqual(newData, toJS(initialData))) this.reset();
        else this.update(newData);
      }
    });
  }

  protected bindAutoSave() {
    reaction(() => toJS(this.data), this.save, {
      delay: this.params.autoSaveDelayMs
    });
  }

  async load(force?: boolean) {
    var { storageType } = this.params;
    if (this.isLoaded && !force) return;
    this.isLoading = true;
    await new Promise((resolve, reject) => {
      chrome.storage[storageType].get(this.id, items => {
        this.update(items[this.id]);
        this.isLoading = false;
        this.isLoaded = true;
        var error = chrome.runtime.lastError;
        if (error) reject(error);
        else resolve(this.data);
      });
    })
  }

  async save() {
    if (!this.isLoaded) await this.load();
    var { storageType } = this.params;
    this.isSaving = true;
    await new Promise((resolve, reject) => {
      chrome.storage[storageType].set({ [this.id]: toJS(this.data) }, () => {
        this.isSaving = false;
        var error = chrome.runtime.lastError;
        if (error) reject(error);
        else resolve();
      });
    })
  }

  update(data: T) {
    if (!data) return;
    if (Array.isArray(this.data)) {
      this.data.splice(0, this.data.length, ...[].concat(data)); // replace
    }
    else if (typeof data === "object") {
      Object.assign(this.data, data); // merge
    }
    else {
      this.data = data;
    }
  }

  reset() {
    var { initialData } = this.params;
    if (typeof this.data === "object" && !Array.isArray(this.data)) {
      Object.keys(toJS(this.data)).forEach(prop => {
        delete this.data[prop]; // clear
      });
    }
    this.update(initialData);
  }
}
