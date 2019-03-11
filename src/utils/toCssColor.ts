import { Color, HSLColor, RGBColor } from "react-color"

export function toCssColor(color: Color): string {
  if (typeof color === 'string') {
    return color;
  }
  else if (typeof color === "object") {
    if (color.hasOwnProperty('r')) {
      let { r, g, b, a } = color as RGBColor;
      return `rgba(${[r, g, b, a].join(',')})`;
    }
    if (color.hasOwnProperty('h')) {
      let { h, s, l, a } = color as HSLColor;
      return `rgba(${[h, s, l, a].join(',')})`;
    }
  }
}
