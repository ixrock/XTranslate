import "./radio.scss";
import * as React from "react";
import { autobind, cssNames, IClassName } from "../../utils";
import { Checkbox, CheckboxProps } from "../checkbox";

const RadioGroupContext = React.createContext<RadioGroup>(null);

export interface RadioGroupProps<D = any> {
  value: D;
  className?: IClassName
  autoFocus?: boolean;
  disabled?: boolean
  onChange?(value: any): void
}

export class RadioGroup extends React.Component<RadioGroupProps> {
  render() {
    var { className, children } = this.props;
    return (
      <RadioGroupContext.Provider value={this}>
        <div className={cssNames("RadioGroup", className)}>
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
}

interface RadioProps extends Omit<CheckboxProps, "checked"> {
  value: any;
  onChange?(value: any): void;
}

export class Radio extends React.Component<RadioProps> {
  static contextType = RadioGroupContext;
  public context: RadioGroup;

  get isChecked() {
    var { value } = this.props;
    return value === this.context.props.value;
  }

  @autobind()
  onChange(checked: boolean, value: any) {
    if (this.isChecked) return;
    var { onChange } = this.context.props;
    if (onChange) onChange(value);
    if (this.props.onChange) {
      this.props.onChange(value);
    }
  }

  render() {
    var { autoFocus, disabled } = this.context.props;
    var {
      className,
      autoFocus = autoFocus,
      disabled = disabled,
      ...checkboxProps
    } = this.props;
    return (
      <Checkbox
        {...checkboxProps}
        autoFocus={autoFocus}
        disabled={disabled}
        className={cssNames("Radio", className)}
        checked={this.isChecked}
        onChange={this.onChange}
      />
    );
  }
}
