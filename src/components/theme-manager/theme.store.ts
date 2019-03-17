import { Color } from "react-color"
import { Store } from "../../store";

export type IUserHistoryStoreData = typeof defaultTheme;

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
  maxWidth: 250,
  maxHeight: 200,
  minWidth: 0,
  minHeight: 0,
  boxShadowBlur: 10,
  boxShadowColor: { r: 102, g: 102, b: 102, a: .5 } as Color,
  boxShadowInner: false,
}

export class ThemeStore extends Store<IUserHistoryStoreData> {
  protected id = "theme";

  public fonts = [
    "Roboto", "Lato", "Open Sans", "Raleway", "Lobster", // custom fonts
    "Arial", "Helvetica Neue", "Times New Roman", // system fonts
  ];

  public borderStyle = [
    "solid", "dotted", "dashed", "double", "groove", "ridge", "inset", "outset"
  ];

  constructor() {
    super({
      storageType: "sync",
      initialData: defaultTheme,
    });
  }
}

export const themeStore = new ThemeStore();