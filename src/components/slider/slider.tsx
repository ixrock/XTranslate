import "./slider.scss";
import * as React from 'react'
import { cssNames } from "../../utils";

type Props = React.HTMLProps<any> & {
  value?: any
  defaultValue?: any
  onChange?(value: number): void;
}

export class Slider extends React.Component<Props, {}> {
  private input: HTMLInputElement;

  onChange = () => {
    var value = this.input.valueAsNumber;
    var onChange = this.props.onChange;
    if (onChange) onChange(value);
  };

  render() {
    var value = this.props.value;
    var { className, children, ...inputProps } = this.props;
    var componentClass = cssNames("Slider", className, {
      disabled: this.props.disabled,
    });
    return (
        <div className={componentClass}>
          <input {...inputProps} type="range" onChange={this.onChange} ref={e => this.input = e}/>
          <span className="value">{value}</span>
        </div>
    );
  }
}
