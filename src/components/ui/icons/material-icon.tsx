// Material design icons
// List of icons - from https://material.io/icons/

require('./material-icon.font.scss');
require('./material-icon.scss');

import * as React from "react";
import { cssNames } from "../../../utils/cssNames";

interface Props extends React.HTMLProps<any> {
  name: string
  active?: boolean
}
export class MaterialIcon extends React.Component<Props, any> {
  render() {
    var { name, active, ...props } = this.props;
    var className = cssNames('material-icons', this.props.className, {
      button: this.props.href || this.props.onClick,
      active: active
    });
    return <i {...props} className={className}>{name}</i>
  }
}
