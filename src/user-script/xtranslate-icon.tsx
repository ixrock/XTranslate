import "./xtranslate-icon.scss"

import React from "react";
import { findDOMNode } from "react-dom";
import { cssNames } from "../utils";
import { Icon, IconProps } from "../components/icon";

interface Props extends Partial<IconProps> {
  preview?: boolean;
}

export class XTranslateIcon extends React.Component<Props> {
  get elem() {
    return findDOMNode(this)
  }

  render() {
    var { className, preview, ...iconProps } = this.props;
    return (
      <Icon
        className={cssNames("XTranslateIcon colorful", className, { preview })}
        svg="logo"
        interactive={true}
        {...iconProps}
      />
    )
  }
}
