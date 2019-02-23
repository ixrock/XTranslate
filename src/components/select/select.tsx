import "./select.scss";

import * as React from "react";
import { cssNames, noop, autobind } from "../../utils";
import { MaterialIcon } from "../icons";

interface Props extends React.HTMLProps<any> {
  value?: any
  inline?: boolean
  onChange?: (value) => any;
}

export class Select extends React.Component<Props, {}> {
  static defaultProps: Props = {
    inline: false,
    onChange: noop
  }

  private findValueByIndex(index: number, options = this.props.children) {
    var items = React.Children.toArray(options) as React.ReactElement<OptionProps>[];
    var searchIndex = 0;
    for (var item of items) {
      let { type, props } = item;
      if (type === Option || type === "option") {
        if (index === searchIndex) return props.value;
        else searchIndex++;
      }
      else if (type === OptGroup || type === "optgroup") {
        let groupOptions = React.Children.toArray(props.children);
        let value = this.findValueByIndex(index - searchIndex, groupOptions);
        if (value !== undefined) return value;
        else searchIndex += groupOptions.length;
      }
    }
  }

  @autobind()
  onChange(evt: React.FormEvent<HTMLSelectElement>) {
    var selectedIndex = evt.currentTarget.selectedIndex;
    var value = this.findValueByIndex(selectedIndex);
    this.props.onChange(value);
  }

  render() {
    var { className, inline, multiple, ...selectProps } = this.props;
    var componentClass = cssNames('Select flex', { inline }, className);
    return (
      <div className={componentClass}>
        <select {...selectProps} onChange={this.onChange}/>
        <MaterialIcon name="keyboard_arrow_down" className="icon"/>
      </div>
    );
  }
}

interface OptGroupProps extends React.DOMAttributes<HTMLOptGroupElement> {
  label?: string
  disabled?: boolean
}

export class OptGroup extends React.Component<OptGroupProps, {}> {
  render() {
    return <optgroup {...this.props}/>
  }
}

interface OptionProps extends React.DOMAttributes<HTMLOptionElement> {
  value: any
  title?: string
  disabled?: boolean
}

export class Option extends React.Component<OptionProps, {}> {
  render() {
    var { value, title, ...props } = this.props;
    title = title != null ? title : String(value);
    return <option {...props} value={value}>{title}</option>
  }
}