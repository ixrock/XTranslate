require('./select.scss');

import * as React from 'react'
import { autobind } from "core-decorators";
import { cssNames, noop } from "../../../utils";
import { MaterialIcon } from "../icons";
import omit = require('lodash/omit');
import find = require('lodash/find');

export type SelectProps = Props;

interface Props {
  className?: any
  value?: any
  onChange(value): void;
}

export class Select extends React.Component<Props, {}> {
  private elem: HTMLSelectElement;

  public state = {
    value: this.props.value
  };

  static defaultProps: Props = {
    value: "",
    onChange: noop
  };

  componentWillReceiveProps(nextProps: Props) {
    if (this.value !== nextProps.value  && nextProps.hasOwnProperty('value')) {
      this.setValue(nextProps.value, true);
    }
  }

  get value() {
    return this.state.value;
  }

  set value(value) {
    this.setValue(value);
  }

  setValue(value, silent = false) {
    this.setState({ value });
    if (!silent) this.props.onChange(value);
  }

  @autobind()
  onChange() {
    this.value = this.elem.value;
  }

  render() {
    var props = omit(this.props, ['className']);
    var className = cssNames('Select flex', this.props.className);
    var options = React.Children.toArray(this.props.children) as OptionElem[];
    return (
        <div className={className}>
          <select {...props} value={this.value} onChange={this.onChange} ref={e => this.elem = e}>
            {options.map(option => {
              var title = option.props.title || option.props.value;
              return <option key={option.key} {...option.props}>{title}</option>
            })}
          </select>
          <MaterialIcon name="keyboard_arrow_down" className="icon"/>
        </div>
    );
  }
}

type OptionElem = React.ReactElement<OptionProps>;

interface OptionProps extends React.Attributes {
  title?: string
  disabled?: boolean
  value: any
}

export class Option extends React.Component<OptionProps, {}> {
  render() {
    return null;
  }
}