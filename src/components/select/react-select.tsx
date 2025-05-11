import "./react-select.scss";

import React from "react";
import { cssNames } from "../../utils";
import ReactSelectComponent, { GroupBase, MultiValue, Props } from "react-select";

export { FormatOptionLabelMeta } from "react-select";

export type ReactSelectGroup<T> = GroupBase<ReactSelectOption<T>>
export type ReactSelectMultiValue<T> = MultiValue<ReactSelectOption<T>>

export interface ReactSelectOption<T = unknown> {
  value: T;
  label?: React.ReactNode;
  isDisabled?: boolean;
  isSelected?: boolean;
  isFocused?: boolean;
}

export interface ReactSelectProps<T> extends Omit<Props, "onChange"> {
  onChange?(value: ReactSelectOption<T>): void;
}

export class ReactSelect<T> extends React.Component<ReactSelectProps<T>> {
  render() {
    const { ...selectProps } = this.props;

    return (
      <ReactSelectComponent
        {...selectProps}
        className={cssNames("ReactSelect", selectProps.className)}
        classNamePrefix={cssNames("ReactSelectCustomize", selectProps.classNamePrefix)}
      />
    );
  }
}
