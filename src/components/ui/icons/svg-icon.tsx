require('./svg-icon.scss');
import * as React from 'react';
import { cssNames } from "../../../utils";

interface Props extends React.HTMLProps<any> {
  source: string
  small?: boolean
  big?: boolean
  altText?: string
}

export class SvgIcon extends React.Component<Props, {}> {
  render() {
    var { source, small, big, altText, ...props } = this.props;
    props.className = cssNames("SvgIcon", this.props.className, {
      button: this.props.href || this.props.onClick,
      small: small,
      big: big
    });
    if (source.match(/\.svg$/i)) {
      // attach svg as with image tag
      props.children = <img src={source} alt={altText}/>
    }
    else {
      // attach as inline svg (plain html text)
      props.dangerouslySetInnerHTML = { __html: source };
    }
    return this.props.href
        ? <a {...props}/>
        : <i {...props}/>;
  }
}