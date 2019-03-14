import "./xtranslate-icon.scss"

import React from "react";
import { cssNames } from "../utils";
import { Icon, IconProps } from "../components/icon";

interface Props extends Partial<IconProps> {
  bindRef?: (icon: Icon) => void;
}

export class XTranslateIcon extends React.Component<Props> {
  render() {
    var { className, bindRef, ...iconProps } = this.props;
    return (
      <Icon
        className={cssNames("XTranslateIcon", className)}
        svg="logo" colorful actionIcon
        ref={bindRef}
        {...iconProps}
      />
    )
  }
}
