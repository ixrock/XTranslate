import * as styles from "./slider.module.scss";
import React from "react"
import { cssNames } from "../../utils";

export interface Props extends Omit<React.HTMLProps<HTMLInputElement>, "onChange"> {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  formatTitle?(value: number): string | React.ReactNode;
  onChange?(value: number, evt: React.ChangeEvent<HTMLInputElement>): void;
}

export class Slider extends React.Component<Props> {
  public input: HTMLInputElement;

  focus() {
    this.input.focus();
  }

  onChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    var value = evt.target.valueAsNumber;
    var onChange = this.props.onChange;
    if (onChange) {
      onChange(value, evt);
    }
  }

  render() {
    var value = this.props.value;
    var { className, formatTitle, children, ...inputProps } = this.props;
    var componentClass = cssNames(styles.Slider, className, {
      [styles.disabled]: this.props.disabled,
    });
    return (
      <div className={componentClass}>
        <input {...inputProps} type="range" onChange={this.onChange} ref={e => {
          this.input = e
        }}
        />
        <span className={styles.title}>
          {formatTitle ? formatTitle(value) : value}
        </span>
      </div>
    );
  }
}
