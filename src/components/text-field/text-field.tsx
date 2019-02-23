import "./text-field.scss";

import * as React from "react";
import { cssNames, autobind } from "../../utils";
import { MaterialIcon } from "../icons/material-icon";
import { Props, State, ValidatorError, ValidatorObject } from "./text-field.types";
import { Validators } from "./text-field.validators";
import { Tooltip } from "../tooltip";
import { SvgIcon } from "../icons/svg-icon";
import isFunction = require("lodash/isFunction");
import isString = require("lodash/isString");
import uniqueId = require("lodash/uniqueId");

export class TextField extends React.Component<Props, State> {
  public id = uniqueId("text_field_");

  public elem: HTMLElement;
  public input: HTMLInputElement | HTMLTextAreaElement;
  private validators: ValidatorObject[] = [];
  private asyncValidator: Promise<any>;

  static IS_FOCUSED = 'focused';
  static IS_DIRTY = 'dirty';
  static IS_INVALID = 'invalid';
  static IS_EMPTY = 'empty';
  static VALIDATORS = Validators;

  public state: State = {
    initValue: this.getValue(),
    dirty: !!(this.props.dirty || this.getValue()),
    valid: true,
    errors: [],
  };

  static defaultProps: Props = {
    showErrors: true,
  };

  setValue(newValue: string | number = "", silent = false) {
    var { value, defaultValue, type, maxLength, min, max, onChange } = this.props;
    var isNumber = type === "number";
    if (isNumber) {
      newValue = +newValue == newValue ? +newValue : "";
    }
    if (value !== newValue) {
      var preventUpdate = (
        (maxLength > 0 && newValue.toString().length > maxLength) ||
        isNumber && (
          (min != null && newValue < min) ||
          (max != null && newValue > max)
        )
      );
      if (!preventUpdate) {
        if (defaultValue != null && newValue != null && !this.isFocused) {
          this.input.value = newValue.toString();
        }
        if (onChange && !silent) onChange(newValue);
        if (!this.isFocused) this.validate(newValue);
        else setTimeout(() => this.validate(newValue)); // prevent jumping cursor position
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
    return this.state.valid;
  }

  get dirty() {
    return this.state.dirty;
  }

  get isFocused() {
    return document.activeElement === this.input
  }

  focus() {
    if (!this.input) return;
    this.input.focus();
  }

  select() {
    this.input.select()
  }

  componentWillMount() {
    this.initValidators();
    this.validate();
  }

  componentWillReceiveProps(nextProps: Props) {
    var { value, dirty, error } = this.props;
    if (dirty !== nextProps.dirty) {
      this.setDirty(nextProps.dirty);
    }
    if (value !== nextProps.value && this.input.value != nextProps.value) {
      this.setValue(nextProps.value);
    }
    if (error !== nextProps.error) {
      this.validate();
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
    var asyncValidators = [];

    for (var validator of this.validators) {
      let { validate, message } = validator;
      var isValid = validate(strVal, this.props);
      if (isValid instanceof Promise) {
        asyncValidators.push(isValid);
      }
      else {
        valid = valid && isValid;
        if (!valid) {
          var error = isFunction(message) ? message(strVal, this.props) : message || "";
          errors.push(error);
          if (error && this.props.showErrors !== "all") break;
        }
      }
    }

    // reset last used async validator for correct work isLast() below when promise will get result later
    this.asyncValidator = null;

    // don't handle errors from async validators if it's already invalid
    var validating = asyncValidators.length && valid;
    if (validating) {
      valid = false;
      var asyncValidator = this.asyncValidator = Promise.all(asyncValidators);
      var isLast = () => this.asyncValidator === asyncValidator; // handle last validation
      asyncValidator.then(() => {
        if (isLast()) this.setValidity(true);
      }).catch((error: ValidatorError) => {
        if (isLast()) {
          this.setDirty();
          this.setValidity(false, [error, ...this.state.errors]);
        }
      });
    }

    this.setValidity(valid, errors, validating);
  }

  setValidity(valid = true, errors = this.state.errors, validating = false) {
    var dirtyOnBlur = this.dirty ? false : this.state.initValue !== this.getValue();
    this.setState({ valid, validating, errors, dirtyOnBlur: dirtyOnBlur }, () => {
      this.input.setCustomValidity(valid ? "" : " ");
    });
  }

  setDirty(dirty = true) {
    if (this.dirty === dirty) return;
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
    if (this.props.onFocus) this.props.onFocus(evt);
    if (this.elem) this.elem.classList.add(TextField.IS_FOCUSED);
  }

  @autobind()
  private onBlur(evt) {
    if (this.props.onBlur) this.props.onBlur(evt);
    if (this.elem) this.elem.classList.remove(TextField.IS_FOCUSED);
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
      dirty, error, validators, showErrors, compactError, showValidationIcon,
      ...props
    } = this.props;

    var { value, defaultValue, maxLength, rows, type } = this.props;
    var { errors, dirty, valid, validating } = this.state;
    var currentValue = this.getValue();

    if (isString(iconLeft)) iconLeft = <MaterialIcon name={iconLeft}/>
    if (isString(iconRight)) iconRight = <MaterialIcon name={iconRight}/>

    var inputProps = Object.assign(props, {
      className: "input box grow",
      value: currentValue == null ? "" : value,
      onBlur: this.onBlur,
      onFocus: this.onFocus,
      onChange: this.onChange,
      rows: multiLine ? (rows || 1) : null,
      ref: e => this.input = e,
    });

    var componentClass = cssNames('TextField', className, {
      readOnly: props.readOnly,
      [TextField.IS_INVALID]: !valid,
      [TextField.IS_DIRTY]: dirty,
      [TextField.IS_FOCUSED]: this.isFocused,
      [TextField.IS_EMPTY]: !currentValue,
    });

    if (showValidationIcon && dirty) {
      var tooltipId = this.id + "_tooltip";
      var validationIcon = (
        <div id={tooltipId} className={cssNames("validation-icon", { valid, invalid: !valid })}>
          {validating
            ? <SvgIcon name="spinner" small/>
            : <MaterialIcon name={valid ? "check" : "error_outline"}/>}
          <Tooltip htmlFor={tooltipId}>{React.Children.toArray(errors)}</Tooltip>
        </div>
      );
    }
    if (maxLength && multiLine) {
      var maxLengthIndicator = (
        <span className="maxLength">{currentValue == null ? 0 : currentValue.toString().length} / {maxLength}</span>
      );
    }

    if (multiLine) var input = <textarea {...inputProps}/>;
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
          <div className={cssNames("errors", { compact: compactError })}>
            {dirty ? errors.map((error, i) => <div key={i} className="error">{error}</div>) : null}
          </div>
        ) : null}
      </div>
    );
  }
}
