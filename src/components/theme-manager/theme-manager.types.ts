import { ColorValue } from "../ui/color-picker/cssColor";

export type IThemeManagerState = Theme;

export interface Theme {
  bgcMain?: ColorValue,
  bgcSecondary?: ColorValue,
  bgcLinear?: boolean,
  fontSize?: number,
  fontFamily?: string,
  textColor?: ColorValue,
  textShadowRadius?: number,
  textShadowOffsetX?: number,
  textShadowOffsetY?: number,
  textShadowColor?: ColorValue,
  borderColor?: ColorValue,
  borderWidth?: number,
  borderStyle?: string,
  borderRadius?: number,
  maxWidth?: number,
  maxHeight?: number,
  minWidth?: number,
  minHeight?: number,
  boxShadowBlur?: number,
  boxShadowColor?: ColorValue,
  boxShadowInner?: boolean,
}