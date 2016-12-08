require('./radio.scss');
import * as React from 'react'
import { autobind } from "core-decorators";
import { cssNames, noop } from "../../../utils";
import omit = require('lodash/omit');

interface RadioGroupProps {
  className?: any
  name: string
  value?: any
  onChange?: (value) => any
}

export class RadioGroup extends React.Component<RadioGroupProps, {}> {
  public activeRadio: Radio;
  public onChange = this.props.onChange || noop;

  get value() {
    return this.activeRadio ? this.activeRadio.value : null;
  }

  render() {
    var { name, value } = this.props;
    return (
        <div className={cssNames("RadioGroup", this.props.className)}>
          {React.Children.map(this.props.children, (radio: RadioElem) => {
            try {
              var checked = value !== undefined ? radio.props.value === value : radio.props.checked;
              return React.cloneElement(radio, {
                group: this,
                name: name,
                checked: checked
              } as any);
            } catch (e) {
              return null;
            }
          })}
        </div>
    );
  }
}

type RadioElem = React.ReactElement<RadioProps>;

type RadioProps = React.HTMLProps<any> & {
  group?: RadioGroup
  label?: string
  value?: any
  checked?: boolean
  onChange?(value): void;
}

export class Radio extends React.Component<RadioProps, {}> {
  private input: HTMLInputElement;
  static defaultProps = {
    onChange: noop
  };

  get value() {
    return this.props.value;
  }

  check() {
    if (this.input.checked) return;
    this.input.checked = true;
    this.onChange(this.value);
  }

  unCheck() {
    if (!this.input.checked) return;
    this.input.checked = false;
    this.props.onChange(null);
  }

  @autobind()
  onChange(value) {
    this.props.onChange(value);
    var group = this.props.group;
    if (group) {
      group.activeRadio = this;
      group.onChange(value);
    }
  }

  render() {
    var props = omit(this.props, ['label', 'group', 'checked', 'children']);
    var label = this.props.label;
    var componentClass = cssNames('Radio flex align-center', this.props.className, {});
    return (
        <label className={componentClass}>
          <input {...props}
              defaultChecked={this.props.checked || this.props.defaultChecked}
              type="radio" onChange={() => this.onChange(this.value)}
              ref={e => this.input = e}/>
          <i className="tick flex center"/>
          {label ? <span className="label">{label}</span> : null}
          {this.props.children}
        </label>
    );
  }
}

export default Radio;