import { action, observable, reaction, toJS, when } from "mobx";
import { autobind } from "./utils/autobind";

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
    autoSave: false,
    autoSaveDelayMs: 250,
    storageType: "local",
  };

  @observable isLoading = false;
  @observable isLoaded = false;
  @observable isSaving = false;
  @observable data: T;

  get params() {
    return Object.assign({}, Store.defaultParams, this.initialParams);
  }

  constructor(protected initialParams: StoreParams<T>) {
    var { initialData, autoLoad, storageType } = this.params;
    this.data = initialData;

    if (autoLoad) {
      this.load();
    }

    // bind auto-save to chrome.store reaction on data change
    when(() => this.isLoaded, () => {
      reaction(() => toJS(this.data), this.onChange, {
        delay: this.params.autoSaveDelayMs
      });
    });

    // sync changes made from options page (for background & content pages)
    chrome.storage.onChanged.addListener((changes, areaName) => {
      var isCurrentStore = areaName === storageType && changes[this.id];
      if (!isCurrentStore || this.isSaving) {
        return;
      }
      var data = changes[this.id];
      if (data.newValue) {
        this.update(data.newValue);
      }
      else if (data.oldValue && !data.newValue) {
        this.reset();
      }
    });
  }

  protected onChange() {
    if (!this.params.autoSave) return;
    this.save();
  }

  @action
  async load(force?: boolean): Promise<T> {
    var { storageType } = this.params;
    if (this.isLoaded && !force) return;
    this.isLoading = true;
    return new Promise((resolve, reject) => {
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

  @action
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

  @action
  update(data: Partial<T>) {
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

  @action
  reset() {
    var { initialData, storageType } = this.params;
    this.isSaving = true;
    chrome.storage[storageType].remove(this.id, () => {
      if (typeof this.data === "object" && !Array.isArray(this.data)) {
        Object.keys(toJS(this.data)).forEach(prop => {
          delete this.data[prop]; // clear
        });
      }
      this.update(initialData);
      this.isSaving = false;
    });
  }
}
