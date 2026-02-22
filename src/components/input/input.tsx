import * as styles from "./input.module.scss";
import React, { DOMAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cssNames, debouncePromise, IClassName, noop } from "@/utils";
import { Icon } from "../icon";
import { conditionalValidators, Validator } from "./input.validators";
import isString from "lodash/isString"
import isFunction from "lodash/isFunction"
import isBoolean from "lodash/isBoolean"
import uniqueId from "lodash/uniqueId"

type InputElement = HTMLInputElement | HTMLTextAreaElement;
type InputElementProps = InputHTMLAttributes<InputElement> & TextareaHTMLAttributes<InputElement> & DOMAttributes<InputElement>;

export type InputProps<T = any> = Omit<InputElementProps, "onChange"> & {
  className?: IClassName;
  value?: T;
  multiLine?: boolean; // use text-area as input field
  maxRows?: number; // when multiLine={true} define max rows size
  dirty?: boolean; // show validation errors even if the field wasn't touched yet
  showErrors?: boolean; // show text error messages under input element
  showValidationLine?: boolean; // show animated validation line for async validators
  restoreInvalidOnBlur?: boolean; // restore "focused" valid value on-blur when if it's invalid
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
  static defaultProps: InputProps = {
    rows: 1,
    maxRows: 10000,
    showErrors: true,
    showValidationLine: true,
    restoreInvalidOnBlur: true,
    validators: [],
  };

  public elem: InputElement;
  private validators: Validator[] = [];
  private validationId: string;
  private focusValue: string;

  public state: State = {
    dirty: !!this.props.dirty,
    valid: true,
    errors: [],
  }

  setValue(value: string | number) {
    if (value != this.getValue()) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(this.elem.constructor.prototype, "value").set;
      nativeInputValueSetter.call(this.elem, value);
      const evt = new Event("input", { bubbles: true });
      this.elem.dispatchEvent(evt);
    }
  }

  getValue(): string {
    const { value, defaultValue = "" } = this.props;
    if (value !== undefined) return value; // controlled input
    if (this.elem) return this.elem.value; // uncontrolled input
    return defaultValue as string;
  }

  focus() {
    this.elem.focus();
  }

  select() {
    this.elem.select()
  }

  async validate(value = this.getValue()) {
    const errors: React.ReactNode[] = [];
    const asyncValidators: Promise<any>[] = [];

    for (let validator of this.validators) {
      if (errors.length) {
        break; // stop validation checks after single error
      }
      const result = validator.validate(value, this.props);
      if (isBoolean(result) && !result) {
        errors.push(this.getValidatorError(value, validator));
      } else if (result instanceof Promise) {
        const asyncValidatorResult = result.then(noop, error => this.getValidatorError(value, validator) || error);
        asyncValidators.push(asyncValidatorResult);
      }
    }

    // save sync validators result first
    this.setValidation(errors);

    // handle async validators result
    if (asyncValidators.length > 0) {
      const validationId = this.validationId = uniqueId("validation_id_");
      this.setState({ validating: true, valid: false, });
      const asyncErrors = await Promise.all(asyncValidators);
      const isLastValidationCheck = this.validationId === validationId;
      if (isLastValidationCheck) {
        errors.length = 0;
        errors.push(...this.state.errors, ...asyncErrors.filter(Boolean));
        this.setValidation(errors);
      }
    }

    this.elem.setCustomValidity(errors.length ? errors[0].toString() : "");
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

  onFocus = (evt: React.FocusEvent<InputElement>) => {
    const { onFocus, restoreInvalidOnBlur } = this.props;
    if (restoreInvalidOnBlur) {
      this.focusValue = this.getValue();
    }
    if (onFocus) {
      onFocus(evt);
    }
    this.setState({ focused: true });
  }

  onBlur = (evt: React.FocusEvent<InputElement>) => {
    const { onBlur, restoreInvalidOnBlur } = this.props;
    const focusValue = this.focusValue;
    let value = this.getValue();
    const { valid, dirtyOnBlur } = this.state;
    if (restoreInvalidOnBlur && !valid) {
      value = focusValue;
      this.setValue(focusValue);
    }
    if (onBlur) {
      onBlur(evt);
    }
    if (dirtyOnBlur) {
      this.setState({ dirty: true, dirtyOnBlur: false });
    }
    this.setState({ focused: false });
  }

  onChange = (evt: React.ChangeEvent<any>) => {
    if (this.props.onChange) {
      this.props.onChange(evt.currentTarget.value, evt);
    }

    this.validate();

    // mark input as dirty for the first time only onBlur() to avoid immediate error-state show when start typing
    if (!this.state.dirty) {
      this.setState({ dirtyOnBlur: true });
    }

    // re-render component when used as uncontrolled input
    // when used @defaultValue instead of @value changing real input.value doesn't call render()
    if (this.isUncontrolled && this.showMaxLenIndicator) {
      this.forceUpdate();
    }
  }

  get showMaxLenIndicator() {
    const { maxLength, multiLine } = this.props;
    return maxLength && multiLine;
  }

  get isUncontrolled() {
    return this.props.value === undefined;
  }

  componentDidMount() {
    this.setupValidators();
  }

  componentDidUpdate(prevProps: InputProps) {
    const { defaultValue, value, dirty, validators } = this.props;
    if (prevProps.value !== value || defaultValue !== prevProps.defaultValue) {
      this.validate();
    }
    if (prevProps.dirty !== dirty) {
      this.setDirty(dirty);
    }
    if (prevProps.validators !== validators) {
      this.setupValidators();
    }
  }

  bindRef = (elem: InputElement) => {
    this.elem = elem;
  }

  render() {
    let {
      className, multiLine, dirty: _dirty, iconRight, iconLeft,
      showValidationLine, showErrors, validators, maxRows, children,
      restoreInvalidOnBlur, labelContent, infoContent,
      ...inputProps
    } = this.props;
    const { maxLength, rows, disabled } = inputProps;
    const { focused, dirty, valid, validating, errors } = this.state;

    // normalize material-icons
    if (isString(iconLeft)) iconLeft = <Icon material={iconLeft}/>
    if (isString(iconRight)) iconRight = <Icon material={iconRight}/>

    // prepare input props
    Object.assign(inputProps, {
      onFocus: this.onFocus,
      onBlur: this.onBlur,
      onChange: this.onChange,
      rows: multiLine ? (rows || 1) : null,
      ref: this.bindRef,
    });

    return (
      <div className={cssNames(styles.Input, className, {
        [styles.focused]: focused,
        [styles.disabled]: disabled,
        [styles.invalid]: !valid,
        [styles.dirty]: dirty,
        [styles.validating]: validating,
        [styles.validatingLine]: validating && showValidationLine,
      })}>
        <label>
          {iconLeft}
          {multiLine ? <textarea {...inputProps as any}/> : <input {...inputProps as any}/>}
          {iconRight}
          {labelContent}
        </label>
        <div className={styles.inputInfo}>
          {infoContent}
          {showErrors && !valid && dirty && (
            <div className={styles.errors}>
              {errors.map((error, i) => <p key={i}>{error}</p>)}
            </div>
          )}
          {this.showMaxLenIndicator && (
            <div className={styles.maxLengthIndicator}>
              {this.getValue().length} / {maxLength}
            </div>
          )}
        </div>
      </div>
    );
  }
}
