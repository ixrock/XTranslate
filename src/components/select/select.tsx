import "./select.scss";

import * as React from "react";
import { cssNames } from "../../utils";
import { Icon } from "../icon";

const SelectContext = React.createContext<Select>(null);

export interface SelectProps<T = any> {
  id?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  required?: boolean;
  value?: T;
  onChange?(value: T, evt: React.ChangeEvent<HTMLSelectElement>): void;
  getOptionValue?(value: T): string;
  getOptionLabel?(value: T): string;
}

export class Select extends React.Component<SelectProps> {
  static defaultProps: SelectProps = {
    getOptionValue: (value: any) => JSON.stringify(value), // must be unique within <select>
    getOptionLabel: (value: any) => String(value),
  };

  public optionValues = new Map<string, any>();

  onChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    var value = this.optionValues.get(evt.target.value);
    if (this.props.onChange) {
      this.props.onChange(value, evt);
    }
  }

  render() {
    var { className, value, getOptionValue, getOptionLabel, ...selectProps } = this.props;
    return (
      <SelectContext.Provider value={this}>
        <div className={cssNames("Select flex", className)}>
          <select
            {...selectProps}
            value={getOptionValue(value)}
            onChange={this.onChange}
          />
          <Icon material="keyboard_arrow_down" className="arrow-icon"/>
        </div>
      </SelectContext.Provider>
    );
  }
}

interface OptionsGroupProps extends React.HTMLProps<HTMLOptGroupElement> {
  label?: string;
  disabled?: boolean
}

export class OptionsGroup extends React.Component<OptionsGroupProps> {
  render() {
    return <optgroup {...this.props}/>
  }
}

interface OptionProps {
  value: any
  label?: string
  disabled?: boolean
}

export class Option extends React.Component<OptionProps> {
  static contextType = SelectContext;
  declare context: Select;
  public elem: HTMLOptionElement;

  constructor(props: OptionProps) {
    super(props);
    this.bindRef = this.bindRef.bind(this);
  }

  bindRef(elem: HTMLOptionElement) {
    var { value } = this.props;
    var { getOptionValue } = this.context.props;
    this.context.optionValues.set(getOptionValue(value), value);
    this.elem = elem;
  }

  render() {
    var { getOptionValue, getOptionLabel } = this.context.props;
    var { value, label, ...optProps } = this.props;
    if (!label) label = getOptionLabel(value);
    return (
      <option {...optProps} value={getOptionValue(value)} ref={this.bindRef}>
        {label}
      </option>
    )
  }
}