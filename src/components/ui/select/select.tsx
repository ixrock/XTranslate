require('./select.scss');

import * as React from 'react'
import { cssNames } from "../../../utils";
import { MaterialIcon } from "../icons";

interface Props extends React.HTMLProps<any> {
  value?: any
  defaultValue?: any
  onChange?(value): void;
}

export class Select extends React.Component<Props, {}> {
  protected elem: HTMLSelectElement;

  onChange = (evt) => {
    var index = this.elem.selectedIndex;
    var value = this.options[index].props.value;
    var onChange = this.props.onChange;
    if (onChange) onChange(value);
  };

  get options() {
    return React.Children.toArray(this.props.children) as React.ReactElement<OptionProps>[]
  }

  render() {
    var { className, defaultValue, children, ...selectProps } = this.props;
    var componentClass = cssNames('Select flex', className, {
      disabled: this.props.disabled,
    });
    if (defaultValue == null) {
      var defaultOption = this.options.filter(option => option.props.default)[0];
      if (defaultOption) defaultValue = defaultOption.props.value;
    }
    return (
        <div className={componentClass}>
          <select {...selectProps} defaultValue={defaultValue} onChange={this.onChange} ref={e => this.elem = e}>
            {this.options.map(option => {
              var title = option.props.title || option.props.value;
              return <option key={option.key} {...option.props}>{title}</option>
            })}
          </select>
          <MaterialIcon name="keyboard_arrow_down" className="icon"/>
        </div>
    );
  }
}

interface OptionProps extends React.Attributes {
  value: any
  title?: string
  disabled?: boolean
  default?: boolean
}

export class Option extends React.Component<OptionProps, {}> {
  render() {
    return null;
  }
}