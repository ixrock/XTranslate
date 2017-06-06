import "./text-field.scss";

import * as React from "react";
import { ReactNode } from "react";
import { autobind } from "core-decorators";
import { cssNames, noop } from "../../../utils";
import { MaterialIcon } from "../icons/material-icon";
import { Validator, ValidatorError, ValidatorObject, Validators } from "./text-field.validators";

import isFunction = require("lodash/isFunction");
import isString = require("lodash/isString");

export type Props = React.HTMLProps<any> & {
  value?: string | number
  dirty?: boolean
  multiLine?: boolean;
  showErrors?: boolean | "all"
  showValidationIcon?: boolean;
  validators?: Validator | Validator[]
  iconLeft?: string | React.ReactNode;
  iconRight?: string | React.ReactNode;
  onChange?: (value: string | number) => void;
}

interface State {
  dirty?: boolean
  dirtyOnBlur?: boolean
  errors?: ValidatorError[]
}

export class TextField extends React.Component<Props, State> {
  public elem: HTMLElement;
  public input: HTMLInputElement | HTMLTextAreaElement;
  private validators: ValidatorObject[] = [];

  static IS_FOCUSED = 'focused';
  static IS_DIRTY = 'dirty';
  static IS_INVALID = 'invalid';
  static IS_EMPTY = 'empty';

  public state: State = {
    dirty: this.props.dirty || this.getValue() != null,
    errors: [],
  };

  static defaultProps: Props = {
    showErrors: true,
    onChange: noop,
    onFocus: noop,
    onBlur: noop,
  };

  setValue(newValue: string | number, silent = false) {
    var { value, defaultValue, type, maxLength, min, max } = this.props;
    var isNumber = type === "number";
    if (isNumber) {
      newValue = +newValue == newValue ? +newValue : "";
    }
    if (value !== newValue) {
      if (defaultValue != null && newValue != null && !this.isFocused) {
        this.input.value = newValue.toString();
      }
      if (!this.isFocused) this.setDirty();
      else this.setState({ dirtyOnBlur: true });

      var preventUpdate = (
        (maxLength > 0 && newValue.toString().length > maxLength) ||
        isNumber && (
          (min != null && newValue < min) ||
          (max != null && newValue > max)
        )
      );
      if (!preventUpdate) {
        this.validate(newValue);
        if (!silent) this.props.onChange(newValue);
      }
    }
  }

  getValue() {
    var { defaultValue, value, type } = this.props;
    if (defaultValue != null) {
      var input = this.input;
      if (!input) return defaultValue as string;
      else {
        var inputVal = input.value;
        if (type === "number") return !isNaN(+inputVal) ? +inputVal : "";
        else return inputVal;
      }
    }
    return value;
  }

  get valid() {
    return !this.state.errors.length;
  }

  get dirty() {
    return this.state.dirty;
  }

  get isFocused() {
    return document.activeElement === this.input
  }

  @autobind()
  focus() {
    if (!this.input) return;
    this.input.focus();
  }

  componentWillMount() {
    this.initValidators();
    this.validate();
  }

  componentWillReceiveProps(nextProps: Props) {
    var { value, dirty } = this.props;
    if (dirty !== nextProps.dirty) {
      this.setDirty();
    }
    if (value !== nextProps.value) {
      this.setValue(nextProps.value);
    }
  }

  componentDidUpdate(oldProps: Props) {
    if (oldProps.value !== this.props.value) {
      this.autoFitHeight();
    }
  }

  componentDidMount() {
    this.autoFitHeight();
    if (this.isFocused) {
      this.elem.classList.add(TextField.IS_FOCUSED);
    }
  }

  protected initValidators() {
    var customValidators = [].concat(this.props.validators || []);

    Object.keys(Validators).forEach(name => {
      var validator = Validators[name];
      if (validator.autoBind && validator.autoBind(this.props)) {
        this.validators.push(validator);
      }
    });
    customValidators.forEach(validator => {
      var validatorObj: ValidatorObject = validator;
      if (isFunction(validator)) validatorObj = { validate: validator };
      this.validators.push(validatorObj);
    });
  }

  validate(value = this.getValue()) {
    var strVal = value != null ? value.toString() : "";
    var valid = true;
    var errors = [];

    for (var validator of this.validators) {
      let { validate, message } = validator;
      valid = valid && validate(strVal, this.props);
      if (!valid) {
        var error = isFunction(message) ? message(strVal, this.props) : message || "";
        errors.push(error);
        if (this.props.showErrors !== "all") break;
      }
    }

    this.setState({ errors }, () => {
      this.input.setCustomValidity(valid ? "" : " ");
    });

    return valid;
  }

  setDirty(dirty = true) {
    this.setState({ dirty, dirtyOnBlur: false });
  }

  private autoFitHeight() {
    if (!this.props.multiLine) return;
    var textArea = this.input as HTMLTextAreaElement;
    var lineHeight = parseInt(window.getComputedStyle(textArea).lineHeight);
    var minHeight = lineHeight * (this.props.rows || 1);
    textArea.style.height = "0";
    var paddings = textArea.offsetHeight;
    textArea.style.height = Math.max(minHeight, textArea.scrollHeight) + paddings + "px";
  }

  @autobind()
  private onFocus(evt) {
    this.props.onFocus(evt);
    if (this.elem) {
      this.elem.classList.add(TextField.IS_FOCUSED);
    }
  }

  @autobind()
  private onBlur(evt) {
    this.props.onBlur(evt);
    this.elem.classList.remove(TextField.IS_FOCUSED);
    if (this.state.dirtyOnBlur) this.setDirty();
  }

  @autobind()
  private onChange(evt: React.SyntheticEvent<HTMLInputElement>) {
    this.setValue(evt.currentTarget.value);
  }

  @autobind()
  increment() {
    (this.input as HTMLInputElement).stepUp();
    this.setValue(this.input.value);
  }

  @autobind()
  decrement() {
    (this.input as HTMLInputElement).stepDown();
    this.setValue(this.input.value);
  }

  render() {
    var {
      className, iconLeft, iconRight, multiLine, children,
      dirty, validators, showErrors, showValidationIcon,
      ...props
    } = this.props;

    var { value, defaultValue, maxLength, rows, type } = this.props;
    var { errors, dirty } = this.state;

    if (isString(iconLeft)) iconLeft = <MaterialIcon name={iconLeft}/>
    if (isString(iconRight)) iconRight = <MaterialIcon name={iconRight}/>

    var inputProps = Object.assign(props, {
      className: "input box grow",
      onBlur: this.onBlur,
      onFocus: this.onFocus,
      onChange: this.onChange,
      rows: multiLine ? (rows || 1) : null,
      ref: e => this.input = e,
    });

    var currentValue = defaultValue != null ? defaultValue : value;
    var emptyValue = currentValue == null;
    var hasErrors = errors.length > 0;
    var componentClass = cssNames('TextField', className, {
      readOnly: props.readOnly,
      [TextField.IS_INVALID]: hasErrors,
      [TextField.IS_DIRTY]: dirty,
      [TextField.IS_FOCUSED]: this.isFocused,
      [TextField.IS_EMPTY]: emptyValue,
    });

    if (showValidationIcon && dirty) {
      var validationIcon = (
        <MaterialIcon
          className={cssNames("validation-icon", { error: hasErrors })}
          name={hasErrors ? "close" : "check"}
          title={errors.filter(isString).join("\n")}
        />
      );
    }
    if (maxLength && multiLine) {
      var maxLengthIndicator = (
        <span className="maxLength">{emptyValue ? 0 : currentValue.toString().length} / {maxLength}</span>
      );
    }

    var input: ReactNode;
    if (multiLine) input = <textarea {...inputProps}/>;
    else input = <input {...inputProps}/>;

    return (
      <div className={componentClass} ref={e => this.elem = e}>
        <input type="hidden" disabled={props.disabled}/>
        <label className="label flex gaps align-center">
          {iconLeft}
          {input}
          {validationIcon}
          {iconRight}
          {type === "number" ? (
            <div className="arrow-icons">
              <MaterialIcon name="arrow_drop_up" className="up" onClick={this.increment}/>
              <MaterialIcon name="arrow_drop_down" className="down" onClick={this.decrement}/>
            </div>
          ) : null}
        </label>
        {maxLengthIndicator}
        {children}
        {showErrors ? (
          <div className="errors">
            {dirty ? errors.map((error, i) => <div key={i} className="error">{error}</div>) : null}
          </div>
        ) : null}
      </div>
    );
  }
}
