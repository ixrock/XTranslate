import * as styles from "./checkbox.module.scss"
import uniqueId from "lodash/uniqueId";
import React, { DOMAttributes, type ReactNode } from "react"
import { cssNames, IClassName } from "../../utils";
import { Tooltip, TooltipProps } from "../tooltip";

export type CheckboxProps<D = any> = Omit<DOMAttributes<any>, "onChange"> & {
  id?: string;
  checked: boolean;
  className?: IClassName;
  tickBoxClass?: IClassName;
  labelClass?: IClassName;
  autoFocus?: boolean
  label?: React.ReactNode;
  inline?: boolean
  disabled?: boolean
  value?: D;
  onChange?(checked: boolean, value: D): void;
  tooltip?: ReactNode | Omit<TooltipProps, "htmlFor">; // TODO: move to proper decorator / wrapper (?)
}

export class Checkbox extends React.Component<CheckboxProps> {
  public elem: HTMLLabelElement;
  public checkboxId = this.props.id ?? this.props.tooltip ? uniqueId(`checkbox_tooltip`) : undefined;

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

  renderTooltip() {
    const { tooltip } = this.props;
    if (!tooltip) return;

    return (
      <Tooltip
        following={true}
        {...(typeof tooltip == "object" ? tooltip : { children: tooltip })}
        htmlFor={this.checkboxId}
      />
    )
  }

  bindRef = (elem: HTMLLabelElement) => {
    this.elem = elem;
  }

  render() {
    var {
      id, label, inline, className, checked, disabled, tooltip, children,
      tickBoxClass, labelClass,
    } = this.props;
    className = cssNames(`${styles.Checkbox} align-center`, className, {
      [styles.inline]: inline,
      [styles.checked]: checked,
      [styles.disabled]: disabled,
    });

    return (
      <label
        id={this.checkboxId}
        className={className}
        tabIndex={disabled ? -1 : 0}
        onClick={this.onClick}
        onKeyDown={this.onKeyDown}
        ref={this.bindRef}
      >
        <i className={cssNames(styles.tickBox, tickBoxClass)}/>
        {label && <div className={cssNames(labelClass)}>{label}</div>}
        {children}
        {this.renderTooltip()}
      </label>
    );
  }
}