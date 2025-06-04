import * as styles from "./xtranslate-tooltip.module.scss";
import React from "react";
import { cssNames, IClassName } from "../utils";

export interface XTranslateTooltipProps extends React.PropsWithChildren {
  className?: IClassName;
}

export const XTranslateTooltip = React.forwardRef(XTranslateTooltipRaw);

export function XTranslateTooltipRaw({ className, ...props }: XTranslateTooltipProps, ref: React.Ref<HTMLElement>) {
  return (
    <div
      {...props}
      ref={ref as React.Ref<HTMLDivElement>}
      className={cssNames(styles.XTranslateTooltip, className)}
    />
  )
}
