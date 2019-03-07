import { observable, reaction, toJS } from "mobx";
import { autobind } from "./utils";

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

  @observable loading = false;
  @observable loaded = false;
  @observable saving = false;
  @observable data: T;

  protected constructor(protected params: StoreParams<T>) {
    this.params = Object.assign({}, Store.defaultParams, params);

    var { initialData, autoLoad, autoSave, autoSaveDelayMs, storageType } = this.params;
    this.data = initialData;

    if (autoLoad) {
      this.load();
    }
    if (autoSave) {
      reaction(this.autoSaveReaction, this.save, {
        delay: autoSaveDelayMs
      });
    }
    // sync storage changes made from options page (for background & content pages)
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (this.saving) return;
      if (areaName === storageType && changes[this.id]) {
        this.update(changes[this.id].newValue);
      }
    });
  }

  protected autoSaveReaction(): any {
    return toJS(this.data);
  }

  load = (force?: boolean) => {
    var { storageType } = this.params;
    if (this.loaded && !force) return;
    this.loading = true;
    chrome.storage[storageType].get(this.id, items => {
      this.update(items[this.id]);
      this.loading = false;
      this.loaded = true;
    });
  }

  save = () => {
    var { storageType } = this.params;
    this.saving = true;
    chrome.storage[storageType].set({ [this.id]: toJS(this.data) }, () => {
      this.saving = false;
    });
  }

  update = (data: T) => {
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

  reset = () => {
    this.update(this.params.initialData);
  }
}
