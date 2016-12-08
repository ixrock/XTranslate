require('./checkbox.scss');

import * as React from 'react'
import { autobind } from "core-decorators";
import { cssNames, noop } from "../../../utils";
import omit = require('lodash/omit');

type Props = React.HTMLProps<any> & {
  label?: string
  checked?: boolean
  before?: boolean
  values?: {'true': string, 'false': string}
  onChange?(checked: boolean): void;
}

export class Checkbox extends React.Component<Props, {}> {
  private input: HTMLInputElement;
  public state = {
    checked: this.props.checked
  };

  static defaultProps: Props = {
    checked: false,
    onChange: noop
  };

  componentWillReceiveProps(nextProps: Props) {
    if (this.checked !== nextProps.checked && nextProps.hasOwnProperty('checked')) {
      this.setChecked(nextProps.checked, true);
    }
  }

  get checked(): boolean {
    return this.state.checked;
  }

  set checked(checked: boolean) {
    this.setChecked(checked);
  }

  setChecked(checked: boolean, silent = false) {
    if (this.checked === checked) return;
    this.setState({ checked });
    if (!silent) this.props.onChange(checked);
  }

  get value(): string {
    var values = this.props.values;
    var checked = this.checked.toString();
    return values ? values[checked] : checked;
  }

  get label() {
    var label = this.props.label;
    return label ? <span className="label">{label}</span> : null;
  }

  @autobind()
  onChange() {
    this.checked = this.input.checked;
  }

  render() {
    var before = this.props.before;
    var props = omit(this.props, ['label', 'before', 'children', 'defaultChecked', 'values']);
    var componentClass = cssNames('Checkbox flex align-center', this.props.className, {});
    return (
        <label className={componentClass}>
          <input type="checkbox" {...props}
                 checked={this.checked} onChange={this.onChange}
                 ref={e => this.input = e}/>
          {before ? this.label : null}
          <i className="tick flex center"/>
          {!before ? this.label : null}
          {this.props.children}
        </label>
    );
  }
}

export default Checkbox;