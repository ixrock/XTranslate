import "./slider.scss";
import * as React from 'react'
import { cssNames } from "../../utils";

type Props = React.HTMLProps<any> & {
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
    var componentClass = cssNames("Slider", className, {
      disabled: this.props.disabled,
    });
    return (
      <div className={componentClass}>
        <input {...inputProps} type="range" onChange={this.onChange} ref={e => this.input = e}/>
        <span className="title">
          {formatTitle ? formatTitle(value) : value}
        </span>
      </div>
    );
  }
}
