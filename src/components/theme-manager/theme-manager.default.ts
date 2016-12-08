import { IThemeManagerState, Font } from './theme-manager.types'
import orderBy = require("lodash/orderBy");

export const defaultTheme: IThemeManagerState = {
  bgcMain: "#000",
  bgcSecondary: { r: 98, g: 101, b: 101, a: .85 },
  bgcLinear: true,
  fontSize: 15,
  fontFamily: "Lato",
  textColor: { r: 255, g: 255, b: 255, a: .85 },
  textShadowRadius: 0,
  textShadowOffsetX: 0,
  textShadowOffsetY: 0,
  textShadowColor: "#ffffff",
  borderColor: { r: 135, g: 144, b: 156, a: .5 },
  borderWidth: 2,
  borderStyle: "solid",
  borderRadius: 5,
  maxWidth: 250,
  maxHeight: 200,
  minWidth: 0,
  minHeight: 0,
  boxShadowBlur: 10,
  boxShadowColor: { r: 102, g: 102, b: 102, a: .5 },
  boxShadowInner: false,
};

var fonts: Font[] = [
  { font: "Arial" },
  { font: "Tahoma" },
  { font: "Verdana" },
  { font: "Helvetica Neue" },
  { font: "Times New Roman" },
  { font: "Roboto", family: "sans-serif", loadParams: ["400,700:cyrillic,cyrillic-ext,latin-ext"] },
  { font: "Lato", family: "sans-serif", loadParams: ["400,700:latin-ext"] },
  { font: "Open Sans", family: "sans-serif", loadParams: ["400,700:cyrillic,cyrillic-ext,latin-ext"] },
  { font: "Noto Sans", family: "sans-serif", loadParams: ["400,700:cyrillic,cyrillic-ext,latin-ext"] },
  { font: "Raleway", family: "sans-serif", loadParams: ["400,700:latin-ext"] },
  { font: "Lobster", family: "cursive", loadParams: ["cyrillic,latin-ext"] },
  { font: "Poiret One", family: "cursive", loadParams: ["cyrillic,latin-ext"] },
];

export const fontsList = orderBy(fonts, 'family') as Font[];