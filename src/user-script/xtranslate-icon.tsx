import * as styles from "./xtranslate-icon.module.scss";
import React from "react";
import { cssNames } from "../utils";
import { Icon, IconProps } from "../components/icon";

export class XTranslateIcon extends React.Component<IconProps> {
  public elem: HTMLElement;

  render() {
    const { className, ...iconProps } = this.props;

    return (
      <Icon
        {...iconProps}
        svg="logo"
        colorful interactive
        className={cssNames(styles.XTranslateIcon, className)}
        ref={icon => {
          this.elem = icon?.elem
        }}
      />
    )
  }
}
