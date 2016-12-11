import * as WebFont from 'webfontloader'
import orderBy = require("lodash/orderBy");

export interface Font {
  font: string
  family?: string
  loadParams?: string[]
}

export function loadFonts(fontFamily: string|string[]) {
  fontFamily = [].concat(fontFamily);
  var fonts = fontsList.filter(font => fontFamily.indexOf(font.font) > -1 && font.loadParams);
  if (!fonts.length) return;
  WebFont.load({
    google: {
      families: fonts.map(font => [font.font].concat(font.loadParams).join(':'))
    }
  });
}

export const fontsList = orderBy([
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
], 'family') as Font[];