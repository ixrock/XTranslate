import styles from "./checkbox.module.scss"
import React, { DOMAttributes } from 'react'
import { cssNames, IClassName } from "../../utils";
import { TooltipDecoratorProps, withTooltip } from "../tooltip";

export type CheckboxProps<D = any> = Omit<DOMAttributes<any>, "onChange"> & TooltipDecoratorProps & {
  id?: string;
  checked: boolean;
  className?: IClassName;
  autoFocus?: boolean
  label?: string
  inline?: boolean
  disabled?: boolean
  value?: D;
  onChange?(checked: boolean, value: D): void;
}

@withTooltip
export class Checkbox extends React.Component<CheckboxProps> {
  public elem: HTMLLabelElement;

  componentDidMount() {
    if (this.props.autoFocus) {
      this.focus();
    }
  }

  focus() {
    this.elem.focus();
  }

  toggle() {
    var { checked, value, disabled, onChange } = this.props;
    if (disabled) return;
    if (onChange) {
      onChange(!checked, value);
    }
  }

  onClick = (evt: React.MouseEvent<HTMLLabelElement>) => {
    this.toggle();
    if (this.props.onClick) {
      this.props.onClick(evt);
    }
  }

  onKeyDown = (evt: React.KeyboardEvent<any>) => {
    switch (evt.nativeEvent.code) {
      case "Enter":
      case "Space":
        this.toggle();
        evt.preventDefault(); // prevent page scrolling (space)
        break;
    }
    if (this.props.onKeyDown) {
      this.props.onKeyDown(evt);
    }
  }

  bindRef = (elem: HTMLLabelElement) => {
    this.elem = elem;
  }

  render() {
    var { id, label, inline, className, checked, disabled, tooltip, children } = this.props;
    className = cssNames(`${styles.Checkbox} flex gaps align-center`, className, {
      [styles.inline]: inline,
      [styles.checked]: checked,
      [styles.disabled]: disabled,
    });
    return (
      <label
        id={id}
        className={className}
        tabIndex={disabled ? -1 : 0}
        onClick={this.onClick}
        onKeyDown={this.onKeyDown}
        ref={this.bindRef}
      >
        <i className={`${styles.box} box`}/>
        {label && <div className={styles.label}>{label}</div>}
        {children}
      </label>
    );
  }
}