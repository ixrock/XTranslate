import "./input.scss";

import React, { DOMAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { autobind, cssNames, debouncePromise } from "../../utils";
import { Icon } from "../icon";
import { conditionalValidators, Validator } from "./input.validators";
import isString from "lodash/isString"
import isFunction from "lodash/isFunction"
import isBoolean from "lodash/isBoolean"
import uniqueId from "lodash/uniqueId"

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
type InputElement = HTMLInputElement | HTMLTextAreaElement;
type InputElementProps = InputHTMLAttributes<InputElement> & TextareaHTMLAttributes<InputElement> & DOMAttributes<InputElement>;

export type InputProps<T = any> = Omit<InputElementProps, "onChange"> & {
  className?: string;
  value?: T;
  multiLine?: boolean; // use text-area as input field
  dirty?: boolean; // show validation errors even if the field wasn't touched yet
  showValidationLine?: boolean; // show animated validation line for async validators
  iconLeft?: string | React.ReactNode; // material-icon name in case of string-type
  iconRight?: string | React.ReactNode;
  validators?: Validator | Validator[];
  labelContent?: React.ReactNode;
  infoContent?: React.ReactNode;
  onChange?(value: T, evt: React.ChangeEvent<InputElement>): void;
}

interface State {
  focused?: boolean;
  dirty?: boolean;
  dirtyOnBlur?: boolean;
  valid?: boolean;
  validating?: boolean;
  errors?: React.ReactNode[]
}

export class Input extends React.Component<InputProps, State> {
  public input: InputElement;
  public validators: Validator[] = [];

  static defaultProps: Partial<InputProps> = {
    showValidationLine: true,
    validators: [],
  }

  public state: State = {
    dirty: !!this.props.dirty,
    valid: true,
    errors: [],
  }

  setValue(value: any) {
    if (value !== this.getValue()) {
      var nativeInputValueSetter = Object.getOwnPropertyDescriptor(this.input.constructor.prototype, "value").set;
      nativeInputValueSetter.call(this.input, value);
      var evt = new Event("input", { bubbles: true });
      this.input.dispatchEvent(evt);
    }
  }

  getValue(): string {
    var { value, defaultValue = "" } = this.props;
    if (value !== undefined) return value; // controlled input
    if (this.input) return this.input.value; // uncontrolled input
    return defaultValue as string;
  }

  focus() {
    this.input.focus();
  }

  blur() {
    this.input.blur();
  }

  select() {
    this.input.select()
  }

  private autoFitHeight() {
    if (!this.props.multiLine) return;
    var textArea = this.input;
    var lineHeight = parseInt(window.getComputedStyle(textArea).lineHeight);
    var minHeight = lineHeight * (this.props.rows || 1);
    textArea.style.height = "0";
    var paddings = textArea.offsetHeight;
    textArea.style.height = Math.max(minHeight, textArea.scrollHeight) + paddings + "px";
  }

  private validationId: string;

  async validate(value = this.getValue()) {
    var validationId = (this.validationId = ""); // reset every time for async validators
    var asyncValidators: Promise<any>[] = [];
    var errors: React.ReactNode[] = [];

    // run validators
    for (let validator of this.validators) {
      if (errors.length) {
        // stop validation check if there is an error already
        break;
      }
      var result = validator.validate(value, this.props);
      if (isBoolean(result) && !result) {
        errors.push(this.getValidatorError(value, validator));
      }
      else if (result instanceof Promise) {
        if (!validationId) {
          this.validationId = validationId = uniqueId("validation_id_");
        }
        asyncValidators.push(
          result.then(
            () => null, // don't consider any valid result from promise since we interested in errors only
            error => this.getValidatorError(value, validator) || error
          )
        );
      }
    }

    // save sync validators result first
    this.setValidation(errors);

    // handle async validators result
    if (asyncValidators.length > 0) {
      this.setState({ validating: true, valid: false, });
      var asyncErrors = await Promise.all(asyncValidators);
      var isLastValidationCheck = this.validationId === validationId;
      if (isLastValidationCheck) {
        errors = this.state.errors.concat(asyncErrors.filter(err => err));
        this.setValidation(errors);
      }
    }

    this.input.setCustomValidity(errors.length ? errors[0].toString() : "");
  }

  setValidation(errors: React.ReactNode[]) {
    this.setState({
      validating: false,
      valid: !errors.length,
      errors: errors,
    });
  }

  private getValidatorError(value: string, { message }: Validator) {
    if (isFunction(message)) return message(value, this.props)
    return message || "";
  }

  private setupValidators() {
    this.validators = conditionalValidators
    // add conditional validators if matches input props
      .filter(validator => validator.condition(this.props))
      // add custom validators
      .concat(this.props.validators)
      // debounce async validators
      .map(({ debounce, ...validator }) => {
        if (debounce) validator.validate = debouncePromise(validator.validate, debounce);
        return validator;
      });
    // run validation
    this.validate();
  }

  setDirty(dirty = true) {
    if (this.state.dirty === dirty) return;
    this.setState({ dirty });
  }

  @autobind()
  onFocus(evt: React.FocusEvent<InputElement>) {
    var { onFocus } = this.props;
    if (onFocus) onFocus(evt);
    this.setState({ focused: true });
  }

  @autobind()
  onBlur(evt: React.FocusEvent<InputElement>) {
    var { onBlur } = this.props;
    if (onBlur) onBlur(evt);
    if (this.state.dirtyOnBlur) this.setState({ dirty: true, dirtyOnBlur: false });
    this.setState({ focused: false });
  }

  @autobind()
  async onChange(evt: React.ChangeEvent<HTMLInputElement>) {
    if (this.props.onChange) {
      var input = evt.target;
      var isNumber = this.props.type === "number" && !isNaN(input.valueAsNumber);
      var value = isNumber ? input.valueAsNumber : input.value;
      this.props.onChange(value, evt);
    }

    // validate
    this.validate();

    // fit size for textarea
    this.autoFitHeight();

    // mark input as dirty for the first time only onBlur() to avoid immediate error-state show when start typing
    if (!this.state.dirty) this.setState({ dirtyOnBlur: true });

    // re-render component when used as uncontrolled input
    // when used @defaultValue instead of @value changing real input.value doesn't call render()
    if (this.isUncontrolled && this.showMaxLenIndicator) {
      this.forceUpdate();
    }
  }

  get showMaxLenIndicator() {
    var { maxLength, multiLine } = this.props;
    return maxLength && multiLine;
  }

  get isUncontrolled() {
    return this.props.value === undefined;
  }

  componentDidMount() {
    this.setupValidators();
    this.autoFitHeight();
  }

  componentDidUpdate(prevProps: InputProps) {
    var { defaultValue, value, dirty, validators } = this.props;
    if (prevProps.value !== value || defaultValue !== prevProps.defaultValue) {
      this.validate();
      this.autoFitHeight();
    }
    if (prevProps.dirty !== dirty) {
      this.setDirty(dirty);
    }
    if (prevProps.validators !== validators) {
      this.setupValidators();
    }
  }

  @autobind()
  bindRef(elem: InputElement) {
    this.input = elem;
  }

  render() {
    var { className, iconLeft, iconRight, multiLine, dirty, showValidationLine, validators, labelContent, infoContent, children, ...inputProps } = this.props;
    var { maxLength, rows, disabled } = this.props;
    var { focused, dirty, valid, validating, errors } = this.state;

    className = cssNames("Input", className, {
      focused: focused,
      disabled: disabled,
      invalid: !valid,
      dirty: dirty,
      validating: validating,
      validatingLine: validating && showValidationLine,
    });

    // normalize icons
    if (isString(iconLeft)) iconLeft = <Icon material={iconLeft}/>
    if (isString(iconRight)) iconRight = <Icon material={iconRight}/>

    // prepare input props
    Object.assign(inputProps, {
      className: "input box grow",
      onFocus: this.onFocus,
      onBlur: this.onBlur,
      onChange: this.onChange,
      rows: multiLine ? (rows || 1) : null,
      ref: this.bindRef,
    });

    return (
      <div className={className}>
        <label className="input-area flex gaps align-center">
          {iconLeft}
          {multiLine ? <textarea {...inputProps as any}/> : <input {...inputProps as any}/>}
          {iconRight}
          {labelContent}
        </label>
        <div className="input-info flex gaps">
          {infoContent}
          {!valid && dirty && (
            <div className="errors box grow">
              {errors.map((error, i) => <p key={i}>{error}</p>)}
            </div>
          )}
          {this.showMaxLenIndicator && (
            <div className="maxLengthIndicator box right">
              {this.getValue().length} / {maxLength}
            </div>
          )}
        </div>
      </div>
    );
  }
}
