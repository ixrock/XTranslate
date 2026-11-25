import { EventEmitter } from "events"
import { reaction } from "mobx";
import { Color } from "react-color"
import { getURL, ProxyResponseType } from "@/extension";
import { proxyRequest } from "@/background/httpProxy.bgc";
import { createLogger, disposer, LoggerColor } from "@/utils";
import { createStorage } from "@/storage";

export type ThemeStorageModel = typeof themeStorage.defaultValue;

export const themeStorage = createStorage("theme", {
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

export type CustomFontStorageModel = typeof customFont.defaultValue;

export const customFont = createStorage("customFont", {
  area: "local",
  autoLoad: true,
  defaultValue: {
    fontDataBase64: "", // base64-encoded
    fileName: "", // font-family or file-name
    type: "", // e.g. "font/ttf"
  },
})

export interface IThemeFont {
  familyName: string;
  fileName?: string; // bundled font
}

export interface ThemeStoreEvents {
  fontLoaded: [FontFace];
}

export class ThemeStore {
  public events = new EventEmitter<ThemeStoreEvents>();
  private storage = themeStorage;
  private logger = createLogger({ systemPrefix: `[THEME]`, prefixColor: LoggerColor.INFO_SYSTEM });
  private dispose = disposer();

  public iconsFont: IThemeFont = {
    familyName: "MaterialIcons-XTranslate", // must be the same as defined for <Icon material="">, see: icon.scss
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

  get data() {
    return this.storage.get();
  }

  private bindEvents() {
    this.dispose(); // clear existing handlers if added previously

    this.dispose.push(
      // refresh active font when changed in the settings
      reaction(() => this.data.fontFamily, font => this.loadFont(font), {
        fireImmediately: true,
      }),
    );
  }

  async load() {
    await this.loadFont(this.iconsFont);
    if (themeStorage.loading) {
      await themeStorage.whenReady;
    } else {
      await themeStorage.load();
    }
    this.bindEvents();
  }

  getBundledFont(font: string | IThemeFont): IThemeFont {
    if (typeof font == "string") {
      return this.bundledFonts.find(({ familyName }) => font === familyName);
    }
    return font;
  }

  isLoaded(familyName: string): boolean {
    return [...document.fonts].some((fontFace) => fontFace.family === familyName);
  }

  private async getBundledFontSource(fileName: string): Promise<string | ArrayBuffer> {
    const url = getURL(`assets/fonts/${fileName}`);
    if (location.href.startsWith(getURL())) {
      return `url(${url})`;
    }

    const file = await proxyRequest<Blob>({ url, responseType: ProxyResponseType.BLOB });
    return file.arrayBuffer();
  }

  async loadFont(font: string | IThemeFont) {
    await document.fonts.ready;
    await customFont.load();

    try {
      let fontFace: FontFace;
      const { fileName: customFontName, fontDataBase64, type: customFontType } = customFont.get();
      if (font === customFontName) {
        const fontUrl = `url(data:${customFontType};base64,${fontDataBase64})`;
        fontFace = new FontFace(customFontName, fontUrl, { display: "swap" });
      } else {
        const bundledFont = this.getBundledFont(font);
        if (!bundledFont?.fileName || this.isLoaded(bundledFont.familyName)) return;

        const source = await this.getBundledFontSource(bundledFont.fileName);
        fontFace = new FontFace(bundledFont.familyName, source, { display: "swap" });
      }

      await fontFace.load();
      this.logger.info(`font loaded`, { font: fontFace, origin: location.href });
      document.fonts.add(fontFace);
      this.events.emit("fontLoaded", fontFace);
    } catch (error) {
      this.logger.error(`loading font has failed`, error);
    }
  }

  reset() {
    customFont.reset();
    this.storage.reset();
  }
}

export const themeStore = new ThemeStore();
