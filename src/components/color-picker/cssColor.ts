// Helper for working with react-color values
export type ColorValue = string|RgbColor|HslColor;

export interface Color {
  hex: string;
  rgb: RgbColor;
  hsl: HslColor;
  hsv: HsvColor;
}
export interface RgbColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}
export interface HslColor {
  h: number;
  s: number;
  l: number;
  a?: number;
}
export interface HsvColor {
  h: number;
  s: number;
  v: number;
  a?: number;
}

export function cssColor(color: ColorValue) {
  if (typeof color === 'string') return color;
  if (color.hasOwnProperty('r')) {
    let { r, g, b, a } = color as RgbColor;
    return `rgba(${[r, g, b, a].join(',')})`;
  }
  if (color.hasOwnProperty('h')) {
    let { h, s, l, a } = color as HslColor;
    return `rgba(${[h, s, l, a].join(',')})`;
  }
}