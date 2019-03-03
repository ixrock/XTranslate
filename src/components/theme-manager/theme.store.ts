import { observable, reaction, toJS, when } from "mobx";
import { Color } from "react-color"

export class ThemeStore {
  private id = "theme";

  public fonts = [
    "Roboto", "Lato", "Open Sans", "Raleway", "Lobster", // custom fonts
    "Arial", "Helvetica Neue", "Times New Roman", // system fonts
  ];

  public defaultTheme = {
    bgcMain: "#000" as Color,
    bgcSecondary: { r: 98, g: 101, b: 101, a: .95 } as Color,
    bgcLinear: true,
    fontSize: 15,
    fontFamily: "Roboto",
    textColor: { r: 255, g: 255, b: 255, a: .85 } as Color,
    textShadowRadius: 0,
    textShadowOffsetX: 0,
    textShadowOffsetY: 0,
    textShadowColor: "#ffffff" as Color,
    borderColor: { r: 135, g: 144, b: 156, a: .5 } as Color,
    borderWidth: 2,
    borderStyle: "solid",
    borderRadius: 5,
    maxWidth: 250,
    maxHeight: 200,
    minWidth: 0,
    minHeight: 0,
    boxShadowBlur: 10,
    boxShadowColor: { r: 102, g: 102, b: 102, a: .5 } as Color,
    boxShadowInner: false,
  };

  @observable loading = false;
  @observable loaded = false;
  @observable saving = false;
  @observable data = this.defaultTheme;

  constructor() {
    this.load();
    // add reactions after initial loading to prevent dummy saving
    when(() => !this.loading, () => {
      reaction(() => toJS(this.data), this.save, {
        delay: 500
      });
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
    chrome.storage.sync.set({ [this.id]: this.data }, () => {
      this.saving = false;
    });
  }

  reset = () => {
    for (let prop in this.data) delete this.data[prop];
    Object.assign(this.data, this.defaultTheme);
  }
}

export const themeStore = new ThemeStore();