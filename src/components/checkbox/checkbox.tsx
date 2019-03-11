import './checkbox.scss'
import React from 'react'
import { autobind, cssNames, IClassName } from "../../utils";

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type CheckboxProps<D = any> = Omit<React.DOMAttributes<HTMLElement>, "onChange"> & {
  checked: boolean;
  className?: IClassName;
  autoFocus?: boolean
  label?: string
  inline?: boolean
  disabled?: boolean
  value?: D;
  onChange?(checked: boolean, value: D): void;
}

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

  @autobind()
  onClick(evt: React.MouseEvent<any>) {
    this.toggle();
    if (this.props.onClick) {
      this.props.onClick(evt);
    }
  }

  @autobind()
  onKeyDown(evt: React.KeyboardEvent<any>) {
    switch (evt.nativeEvent.code) {
      case "Enter":
      case "Space":
        this.toggle();
        break;
    }
    if (this.props.onKeyDown) {
      this.props.onKeyDown(evt);
    }
  }

  @autobind()
  bindRef(elem: HTMLLabelElement) {
    this.elem = elem;
  }

  render() {
    var { label, inline, className, checked, disabled, children } = this.props;
    className = cssNames('Checkbox flex gaps align-center', className, {
      inline, checked, disabled
    });
    return (
      <label
        className={className}
        tabIndex={disabled ? -1 : 0}
        onClick={this.onClick}
        onKeyDown={this.onKeyDown}
        ref={this.bindRef}
      >
        <i className="box tick"/>
        {label && <div className="label">{label}</div>}
        {children}
      </label>
    );
  }
}