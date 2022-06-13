import styles from "./xtranslate-icon.module.scss";
import React from "react";
import { findDOMNode } from "react-dom";
import { cssNames } from "../utils";
import { Icon, IconProps } from "../components/icon";

export class XTranslateIcon extends React.Component<IconProps> {
  get elem() {
    return findDOMNode(this)
  }

  render() {
    const { className, ...iconProps } = this.props;

    return (
      <Icon
        {...iconProps}
        svg="logo"
        colorful interactive
        className={cssNames(styles.XTranslateIcon, className)}
      />
    )
  }
}
