import { autorun, when } from "mobx";
import { Color } from "react-color"
import { Store } from "../../store";
import { getURL } from "../../extension";

export type IThemeStoreData = typeof defaultTheme;

export const defaultTheme = {
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

export interface IThemeFont {
  familyName: string;
  fileName?: string;
}

export class ThemeStore extends Store<IThemeStoreData> {
  private loadedFonts = new Set<string>();

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
    super({
      id: "theme",
      storageType: "sync",
      initialData: defaultTheme,
    });
    this.initFonts();
  }

  protected async initFonts() {
    this.loadFont(this.iconsFont);
    await when(() => this.isLoaded);
    autorun(() => this.loadFont(this.data.fontFamily));
  }

  getFont(font: string | IThemeFont) {
    if (typeof font == "string") {
      return this.fonts.find(({ familyName }) => font === familyName);
    }
    return font;
  }

  getFontUrl(font: string | IThemeFont) {
    font = this.getFont(font);
    return getURL(`assets/fonts/${font?.fileName}`)
  }

  async loadFont(font: string | IThemeFont) {
    var { fileName, familyName } = this.getFont(font);
    if (!fileName || this.loadedFonts.has(familyName)) {
      return;
    }
    var fontFace = new FontFace(familyName, `url(${this.getFontUrl(font)})`);
    await fontFace.load();
    document.fonts.add(fontFace);
    this.loadedFonts.add(familyName);
  }
}

export const themeStore = new ThemeStore();