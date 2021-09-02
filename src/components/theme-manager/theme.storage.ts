import { autorun } from "mobx";
import { Color } from "react-color"
import { getURL } from "../../extension";
import { createLogger } from "../../utils";
import { createStorageHelper } from "../../extension/storage";

export const themeStorage = createStorageHelper("theme", {
  area: "sync",
  defaultValue: {
    bgcMain: "#000" as Color,
    bgcSecondary: { r: 98, g: 101, b: 101, a: .95 } as Color,
    bgcLinear: true,
    fontSize: 15,
    fontFamily: "Open Sans",
    textColor: { r: 255, g: 255, b: 255, a: .85 } as Color,
    textShadowRadius: 0,
    textShadowOffsetX: 0,
    textShadowOffsetY: 0,
    textShadowColor: "#ffffff" as Color,
    borderColor: { r: 135, g: 144, b: 156, a: .5 } as Color,
    borderWidth: 2,
    borderStyle: "solid",
    borderRadius: 5,
    maxWidth: 500,
    maxHeight: 250,
    minWidth: 0,
    minHeight: 0,
    boxShadowBlur: 10,
    boxShadowColor: { r: 102, g: 102, b: 102, a: .5 } as Color,
    boxShadowInner: false,
  }
});

export interface IThemeFont {
  familyName: string;
  fileName?: string;
}

export class ThemeStore {
  private logger = createLogger({ systemPrefix: `[THEME]` });

  private storage = themeStorage;
  public ready = themeStorage.whenReady;

  get data() {
    return this.storage.get();
  }

  public iconsFont: IThemeFont = {
    familyName: "Material Icons",
    fileName: "MaterialIcons-Regular.ttf",
  };

  public fonts: IThemeFont[] = [
    { familyName: "Roboto", fileName: "Roboto-Regular.ttf" },
    { familyName: "Lato", fileName: "Lato-Regular.ttf" },
    { familyName: "Open Sans", fileName: "OpenSans-Regular.ttf" },
    { familyName: "Raleway", fileName: "Raleway-Regular.ttf" },
    { familyName: "Lobster", fileName: "Lobster-Regular.ttf" },
    { familyName: "Arial" }, // system fonts
    { familyName: "Helvetica Neue" },
    { familyName: "Times New Roman" },
  ];

  public borderStyle = [
    "solid", "dotted", "dashed", "double", "groove", "ridge", "inset", "outset"
  ];

  constructor() {
    this.initFonts();
  }

  protected async initFonts() {
    await this.ready;
    await this.loadFont(this.iconsFont);
    autorun(() => this.loadFont(this.data.fontFamily));
  }

  protected isFontLoaded(fontFamily: string) {
    var pageFonts = Array.from(document.fonts as unknown as FontFace[]);
    return pageFonts.some(font => font.family === fontFamily);
  }

  getFont(font: string | IThemeFont) {
    if (typeof font == "string") {
      return this.fonts.find(({ familyName }) => font === familyName);
    }
    return font;
  }

  async loadFont(font: string | IThemeFont) {
    var { fileName, familyName } = this.getFont(font);
    if (this.isFontLoaded(familyName)) {
      return;
    }
    try {
      const fontUrl = getURL(`assets/fonts/${fileName}`);
      const font = new FontFace(familyName, `url(${fontUrl})`);
      await font.load();
      // @ts-ignore -- document.fonts.add() is missing from current "lib.dom.d.ts"
      await document.fonts.add(font);
    } catch (error) {
      this.logger.error(`loading font "${familyName}" from file "${fileName}" has failed`);
    }
  }

  reset() {
    this.storage.reset();
  }
}

export const themeStore = new ThemeStore();