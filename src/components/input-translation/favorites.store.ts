import { observable, reaction, toJS, when } from "mobx";

export interface Favorite {
  from: string
  to: string
}

export class FavoritesStore {
  private id = "favorites";

  private initialData: { [vendor: string]: Favorite[] } = {};

  @observable loading = false;
  @observable loaded = false;
  @observable saving = false;
  @observable data = this.initialData;

  constructor() {
    this.load();
    // add reactions after initial loading to prevent dummy saving
    when(() => !this.loading, () => {
      reaction(() => toJS(this.data), this.save, { delay: 250 });
    })
    // sync store changes made from options page (for background & content pages)
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (this.saving) return;
      if (areaName === "sync" && changes[this.id]) {
        Object.assign(this.data, changes[this.id].newValue || {});
      }
    });
  }

  protected load = (force?: boolean) => {
    if (this.loaded && !force) return;
    this.loading = true;
    chrome.storage.sync.get(this.id, items => {
      Object.assign(this.data, items[this.id]);
      this.loading = false;
      this.loaded = true;
    });
  }

  protected save = () => {
    this.saving = true;
    chrome.storage.sync.set({ [this.id]: toJS(this.data) }, () => {
      this.saving = false;
    });
  }

  reset = () => {
    for (let prop in this.data) delete this.data[prop];
    Object.assign(this.data, this.initialData);
  }

  getByVendor(vendorName: string): Favorite[] {
    return this.data[vendorName] || [];
  }
}

export const favoritesStore = new FavoritesStore();