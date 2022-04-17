import { reaction } from "mobx";
import { Color } from "react-color"
import { getURL, proxyRequest, ProxyResponseType } from "../../extension";
import { createLogger } from "../../utils";
import { createStorageHelper } from "../../extension/storage";

export const themeStorage = createStorageHelper("theme", {
  area: "sync",
  autoLoad: true,
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
  private storage = themeStorage;
  private logger = createLogger({ systemPrefix: `[THEME]` });

  get ready() {
    return themeStorage.whenReady;
  }

  get data() {
    return this.storage.get();
  }

  public iconsFont: IThemeFont = {
    familyName: "Material Icons (XTranslate)", // must be the same as defined for <Icon material="">, see: icon.scss
    fileName: "MaterialIcons-Regular.ttf",
  };

  public bundledFonts: IThemeFont[] = [
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
    this.init();
  }

  private async init() {
    await this.ready;
    await this.loadFont(this.iconsFont);

    reaction(() => this.data.fontFamily, font => this.loadFont(font), {
      name: "theme-font-loader",
      fireImmediately: true,
    });
  }

  getBundledFont(font: string | IThemeFont): IThemeFont {
    if (typeof font == "string") {
      return this.bundledFonts.find(({ familyName }) => font === familyName);
    }
    return font;
  }

  async loadFont(font: string | IThemeFont) {
    await document.fonts.ready;

    const { fileName, familyName } = this.getBundledFont(font);
    const isExists = document.fonts.check(`10px "${familyName}"`);
    if (isExists) return; // font is already available in content-page
    if (!fileName) return; // system font is selected by user, e.g. "Arial"

    try {
      const fontBlob = await proxyRequest<Blob>({
        url: getURL(`assets/fonts/${fileName}`),
        responseType: ProxyResponseType.BLOB,
      });
      const font = new FontFace(familyName, await fontBlob.arrayBuffer());
      font.display = "swap";
      await font.load();
      document.fonts.add(font);
    } catch (error) {
      this.logger.error(`loading font "${familyName}" from file "${fileName}" has failed`);
    }
  }

  reset() {
    this.storage.reset();
  }
}

export const themeStore = new ThemeStore();