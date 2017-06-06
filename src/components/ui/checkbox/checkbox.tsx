import "./checkbox.scss";
import * as React from "react";
import { cssNames } from "../../../utils";

type Props = React.HTMLProps<any> & {
  label?: string
  inline?: boolean
  onChange?(checked: boolean): void;
}

export class Checkbox extends React.Component<Props, {}> {
  private input: HTMLInputElement;

  onChange = (evt) => {
    var checked = this.input.checked;
    var onChange = this.props.onChange;
    if (onChange) onChange(checked);
  };

  render() {
    var { label, inline, className, children, ...inputProps } = this.props;
    var componentClass = cssNames('Checkbox flex align-center', className, {
      inline: inline,
      checked: this.props.checked,
      disabled: this.props.disabled,
    });
    return (
      <label className={componentClass}>
        <input type="checkbox" {...inputProps} onChange={this.onChange} ref={e => this.input = e}/>
        <i className="tick flex center"/>
        {label ? <span className="label">{label}</span> : null}
        {children}
      </label>
    );
  }
}