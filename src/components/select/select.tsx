import * as styles from "./select.module.scss";

import React from "react";
import { cssNames, IClassName } from "@/utils";
import { Icon } from "../icon";

const SelectContext = React.createContext<Select>(null);

export interface SelectProps<V = any> extends React.PropsWithChildren {
  id?: string;
  className?: IClassName;
  autoFocus?: boolean;
  disabled?: boolean;
  required?: boolean;
  value?: V;
  onChange?(value: V, evt: React.ChangeEvent<HTMLSelectElement>): void;
  getOptionValue?(value: V): string;
  getOptionLabel?(value: V): string;
}

/**
 * @deprecated use <ReactSelect> instead
 */
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
        <div className={cssNames(styles.Select, className)}>
          <select
            value={getOptionValue(value)}
            {...selectProps}
            onChange={this.onChange}
          />
          <Icon material="keyboard_arrow_down" className={styles.arrowIcon}/>
        </div>
      </SelectContext.Provider>
    );
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