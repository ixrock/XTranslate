import './svg-icon.scss'

import * as React from "react";
import { cssNames } from "../../utils/cssNames";
import get = require("lodash/get");

// inline svg icons
const svgNames = {
  spinner: () => require('!!raw-loader!./spinner.svg'),
};

interface Props extends React.HTMLProps<any> {
  name?: string
  src?: string
  small?: boolean
  big?: boolean
  altText?: string
}

export class SvgIcon extends React.Component<Props, {}> {
  render() {
    var { className, name, src, small, big, altText, ...props } = this.props;
    var iconProps = props as Partial<Props>;
    var iconLoader: any = get(svgNames, name);
    var svgSource: string = iconLoader ? iconLoader() : src;

    iconProps.className = cssNames("SvgIcon", className, {
      button: this.props.href || this.props.onClick,
      small, big
    });
    // attach as normal image tag
    if (svgSource.endsWith(".svg")) {
      iconProps.children = <img src={svgSource} alt={altText}/>;
    }
    // must be loaded as inline svg-text
    else {
      iconProps.dangerouslySetInnerHTML = { __html: svgSource };
    }

    if (props.href) return <a {...props}/>;
    return <i {...props}/>;
  }
}