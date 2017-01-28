require('./radio.scss');
import * as React from 'react'
import { autobind } from "core-decorators";
import { cssNames, noop } from "../../../utils";
import omit = require('lodash/omit');
import uniqueId = require('lodash/uniqueId');

interface RadioGroupProps {
  className?: any
  name?: string
  value?: any
  defaultValue?: any
  disabled?: boolean
  buttonsView?: boolean
  onChange?(value): void
}

export class RadioGroup extends React.Component<RadioGroupProps, {}> {
  render() {
    var { name, value, defaultValue, buttonsView, className, disabled, onChange } = this.props;
    var name = name || uniqueId("radioGroup");
    var radioGroupClassName = cssNames("RadioGroup", className, { buttonsView });
    var radios = React.Children.toArray(this.props.children) as React.ReactElement<RadioProps>[];
    return (
        <div className={radioGroupClassName}>
          {radios.map(radio => {
            if (!radio.props) return;
            var radioProps = {
              name: name,
              disabled: disabled != null ? disabled : radio.props.disabled,
              defaultChecked: defaultValue != null ? defaultValue == radio.props.value : radio.props.defaultChecked,
              checked: value != null ? value === radio.props.value : radio.props.checked,
              onChange: onChange
            };
            return React.cloneElement(radio, radioProps as any)
          })}
        </div>
    );
  }
}

type RadioProps = React.HTMLProps<any> & {
  name?: string
  label?: string
  value?: any
  onChange?(value): void;
}

export class Radio extends React.Component<RadioProps, {}> {
  @autobind()
  onChange() {
    var { value, onChange, checked } = this.props;
    if (!checked && onChange) {
      onChange(value);
    }
  }

  @autobind()
  onKeyDown(e: React.KeyboardEvent<any>) {
    var SPACE_KEY = e.keyCode === 32;
    var ENTER_KEY = e.keyCode === 13;
    if (SPACE_KEY || ENTER_KEY) this.onChange();
  }

  render() {
    var { className, label, children, ...inputProps } = this.props;
    var checked = this.props.checked || this.props.defaultChecked;
    var componentClass = cssNames('Radio flex align-center', className, {
      checked: checked,
      disabled: this.props.disabled,
    });
    return (
        <label className={componentClass} tabIndex={!checked ? 0 : null} onKeyDown={this.onKeyDown}>
          <input {...inputProps} type="radio" onChange={this.onChange}/>
          <i className="tick flex center"/>
          {label ? <span className="label">{label}</span> : null}
          {children}
        </label>
    );
  }
}

export default Radio;