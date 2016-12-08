require('./slider.scss');

import * as React from 'react'
import { autobind } from "core-decorators";
import { cssNames, noop } from "../../../utils";
import omit = require('lodash/omit');

type Props = React.HTMLProps<any> & {
  value?: number
  onChange?(value: number): void;
}

export class Slider extends React.Component<Props, {}> {
  private input: HTMLInputElement;

  public state = {
    value: this.props.value
  };

  static defaultProps: Props = {
    min: 0,
    max: 100,
    value: 50,
    onChange: noop
  };

  componentWillReceiveProps(nextProps: Props) {
    if (this.value !== nextProps.value && nextProps.hasOwnProperty('value')) {
      this.setValue(nextProps.value, true);
    }
  }

  get value() {
    return this.state.value;
  }

  set value(value: number) {
    this.setValue(value);
  }

  setValue(value: number, silent = false) {
    if (this.value === value) return;
    this.setState({ value });
    if (!silent) this.props.onChange(value);
  }

  @autobind()
  onChange() {
    this.value = this.input.valueAsNumber;
  }

  render() {
    var props = omit(this.props, ['className']);
    return (
        <div className={cssNames("Slider", this.props.className)}>
          <input {...props}
              type="range" ref={e => this.input = e}
              value={this.value} onChange={this.onChange}/>
          <span className="value">{this.value}</span>
        </div>
    );
  }
}

export default Slider;