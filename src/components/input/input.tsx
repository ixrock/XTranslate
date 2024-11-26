import * as styles from "./input.module.scss";
import React, { DOMAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cssNames, debouncePromise, IClassName } from "../../utils";
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
  onBlurChanged?(data: OnBlurChangedData, evt: React.ChangeEvent<InputElement>): void;
}

export interface OnBlurChangedData {
  valid: boolean;
  focusValue: string;
  value: string;
}

interface State {
  focused?: boolean;
  dirty?: boolean;
  dirtyOnBlur?: boolean;
  valid?: boolean;
  validating?: boolean;
  errors?: React.ReactNode[]
}

const defaultProps: Partial<InputProps> = {
  rows: 1,
  maxRows: 10000,
  showErrors: true,
  showValidationLine: true,
  restoreInvalidOnBlur: true,
  validators: [],
}

export class Input extends React.Component<InputProps, State> {
  static defaultProps = defaultProps as object;

  public elem: InputElement;
  public validators: Validator[] = [];
  public focusValue: string;

  public state: State = {
    dirty: !!this.props.dirty,
    valid: true,
    errors: [],
  }

  setValue(value: string | number) {
    if (value != this.getValue()) {
      var nativeInputValueSetter = Object.getOwnPropertyDescriptor(this.elem.constructor.prototype, "value").set;
      nativeInputValueSetter.call(this.elem, value);
      var evt = new Event("input", { bubbles: true });
      this.elem.dispatchEvent(evt);
    }
  }

  getValue(): string {
    var { value, defaultValue = "" } = this.props;
    if (value !== undefined) return value; // controlled input
    if (this.elem) return this.elem.value; // uncontrolled input
    return defaultValue as string;
  }

  focus() {
    this.elem.focus();
  }

  blur() {
    this.elem.blur();
  }

  select() {
    this.elem.select()
  }

  private autoFitHeight() {
    var { multiLine, rows, maxRows } = this.props;
    if (!multiLine) {
      return;
    }
    var textArea = this.elem;
    var lineHeight = parseFloat(window.getComputedStyle(textArea).lineHeight);
    var rowsCount = (this.getValue().match(/\n/g) || []).length + 1;
    var height = lineHeight * Math.min(Math.max(rowsCount, rows), maxRows);
    textArea.style.height = height + "px";
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
      } else if (result instanceof Promise) {
        if (!validationId) {
          this.validationId = validationId = uniqueId("validation_id_");
        }
        asyncValidators.push(
          result.then(
            () => {}, // don't consider any valid result from promise since we interested in errors  54only
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
    var { onFocus, onBlurChanged, restoreInvalidOnBlur } = this.props;
    if (onBlurChanged || restoreInvalidOnBlur) {
      this.focusValue = this.getValue();
    }
    if (onFocus) {
      onFocus(evt);
    }
    this.setState({ focused: true });
  }

  onBlur = (evt: React.FocusEvent<InputElement>) => {
    var { onBlurChanged, onBlur, restoreInvalidOnBlur } = this.props;
    var focusValue = this.focusValue;
    var value = this.getValue();
    var { valid, dirtyOnBlur } = this.state;
    if (restoreInvalidOnBlur && !valid) {
      value = focusValue;
      this.setValue(focusValue);
    }
    if (onBlur) {
      onBlur(evt);
    }
    if (onBlurChanged && focusValue != value) {
      onBlurChanged({ valid, value, focusValue }, evt);
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
    this.autoFitHeight();

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

  bindRef = (elem: InputElement) => {
    this.elem = elem;
  }

  render() {
    var {
      className, iconLeft, iconRight, multiLine, dirty,
      showValidationLine, showErrors, validators, maxRows, children,
      restoreInvalidOnBlur, onBlurChanged, labelContent, infoContent,
      ...inputProps
    } = this.props;
    var { maxLength, rows, disabled } = this.props;
    var { focused, dirty, valid, validating, errors } = this.state;

    // normalize icons
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
