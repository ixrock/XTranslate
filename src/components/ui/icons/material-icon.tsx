// Material design icons
// List of icons - from https://material.io/icons/

import "./material-icon.font.scss";
import "./material-icon.scss";

import * as React from "react";
import { cssNames } from "../../../utils/cssNames";

interface Props extends React.HTMLProps<any> {
  name: string
  active?: boolean
  disabled?: boolean
  button?: boolean
}
export class MaterialIcon extends React.Component<Props, any> {
  render() {
    var { name, active, disabled, button, ...props } = this.props;
    var className = cssNames('material-icons', this.props.className, {
      button: button || this.props.href || this.props.onClick,
      active: active,
      disabled: disabled,
    });
    return <i {...props} className={className}>{name}</i>
  }
}
