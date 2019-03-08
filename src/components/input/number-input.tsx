import "./number-input.scss";

import React from "react";
import { Input, InputProps } from "./input";
import { Icon } from "../icon";
import { autobind, cssNames } from "../../utils";

interface Props extends InputProps<number> {
}

export class NumberInput extends React.Component<Props> {
  public input: Input;

  @autobind()
  increment() {
    var inputElem = this.input.input as HTMLInputElement;
    inputElem.stepUp();
    this.input.setValue(inputElem.valueAsNumber);
  }

  @autobind()
  decrement() {
    var inputElem = this.input.input as HTMLInputElement;
    inputElem.stepDown();
    this.input.setValue(inputElem.valueAsNumber);
  }

  @autobind()
  bindRef(input: Input) {
    this.input = input;
  }

  render() {
    var { className, ...inputProps } = this.props;
    className = cssNames("NumberInput", className);
    return (
      <Input
        {...inputProps}
        type="number" className={className} ref={this.bindRef}
        labelContent={(
          <div className="arrow-icons">
            <Icon
              material="arrow_drop_up"
              className="arrow-up"
              onClick={this.increment}
            />
            <Icon
              material="arrow_drop_down"
              className="arrow-down"
              onClick={this.decrement}
            />
          </div>
        )}
      />
    );
  }
}
