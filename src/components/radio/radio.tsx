import * as styles from "./radio.module.scss";
import React from "react";
import { cssNames, IClassName } from "@/utils";
import { Checkbox, CheckboxProps } from "../checkbox";

const RadioGroupContext = React.createContext<RadioGroup>(null);

export interface RadioGroupProps<V = any> extends React.PropsWithChildren {
  value: V;
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
        <div className={cssNames(styles.RadioGroup, className)}>
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
  declare context: RadioGroup;

  get isChecked() {
    var { value } = this.props;
    return value === this.context.props.value;
  }

  onChange = (checked: boolean, value: any) => {
    if (this.isChecked) return;
    var { onChange } = this.context.props;
    if (onChange) onChange(value);
    if (this.props.onChange) {
      this.props.onChange(value);
    }
  }

  render() {
    const parentGroup = this.context.props;
    var {
      className,
      autoFocus = parentGroup.autoFocus,
      disabled = parentGroup.disabled,
      ...checkboxProps
    } = this.props;
    return (
      <Checkbox
        {...checkboxProps}
        autoFocus={autoFocus}
        disabled={disabled}
        className={cssNames(styles.Radio, className)}
        tickBoxClass={styles.tickBox}
        checked={this.isChecked}
        onChange={this.onChange}
      />
    );
  }
}
