require('./text-field.scss');

import * as React from 'react'
import { autobind } from "core-decorators";
import { cssNames, noop } from "../../../utils";
import { MaterialIcon } from "../icons";
import omit = require('lodash/omit');
import isBoolean = require('lodash/isBoolean');

type Props = React.HTMLProps<any> & {
  value?: any
  multiLine?: boolean;
  icon?: string;
  validators?: Validator|Validator[]
  showSingleError?: boolean
  onChange?(value: string): void;
}

// If validator handler returns something other than boolean value, it will be treated as error message.
// In this form of validator it will be marked as important by default.
type ValidatorHandler = (value) => any;
type Validator = ValidatorObject | ValidatorHandler;

interface ValidatorObject {
  errorMessage?: any
  isError: ValidatorHandler
  important?: boolean // show error message even if the component is "dirty"
}

interface Error {
  message: any
  important?: boolean
}

interface State {
  initValue?: any
  value?: any
  valid?: boolean
  dirty?: boolean
}

export class TextField extends React.Component<Props, State> {
  private elem: HTMLElement;
  private input: HTMLInputElement | HTMLTextAreaElement;
  private validators: ValidatorObject[] = [].concat(this.props.validators).filter(v => !!v);
  private errors: Error[] = [];

  static IS_FOCUSED = 'focused';

  static defaultProps = {
    showSingleError: true,
    onChange: noop,
    onFocus: noop,
    onBlur: noop
  };

  constructor(props) {
    super(props);
    var initValue = this.normalize(this.props.value);
    this.state = {
      value: initValue,
      initValue: initValue,
    };
    this.initValidators();
  }

  private normalize(value) {
    var isNumber = this.props.type === 'number';
    return value || (isNumber ? 0 : "");
  }

  get value() {
    return this.state.value;
  }

  set value(value) {
    this.setValue(value);
  }

  setValue(value, silent = false) {
    if (this.value === value) return;
    if ("number" === this.props.type) {
      value = (this.input as HTMLInputElement).valueAsNumber || 0;
      if (!(value >= this.props.min && value <= this.props.max)) return;
    }
    var maxLength = this.props.maxLength;
    if (maxLength && typeof value === 'string') value = value.substr(0, maxLength);
    this.setState({ value }, () => {
      this.autoFitHeight();
      this.validate();
    });
    if (!silent) {
      this.props.onChange(value);
    }
  }

  get valid() {
    return this.state.valid;
  }

  @autobind()
  focus() {
    this.input.focus();
  }

  @autobind()
  blur() {
    this.input.blur();
  }

  @autobind()
  select() {
    this.input.select();
  }

  @autobind()
  validate() {
    var inputValid = true;
    var value = this.input.value;
    this.errors = [];

    for (var validator of this.validators) {
      var error = validator.isError(value);
      inputValid = inputValid && !error;
      if (error) {
        var message = validator.errorMessage || (!isBoolean(error) ? error : null);
        if (message) {
          this.errors.push({ message, important: validator.important });
          if (this.props.showSingleError) break;
        }
      }
    }
    if (this.valid !== inputValid) {
      this.setState({ valid: inputValid });
      this.input.setCustomValidity(inputValid ? "" : " ");
    }
  }

  initValidators() {
    var type = this.props.type;
    var required = this.props.required;
    var minLength = this.props.minLength;

    // add basic html validators
    if (required) {
      this.validators.push({
        errorMessage: "This field is required",
        isError: (value: string) => !value.trim()
      });
    }
    if (type === 'email') {
      this.validators.push({
        errorMessage: "Wrong email format",
        isError: (value: string) => !value.includes('@')
      });
    }
    if (minLength > 0) {
      this.validators.push({
        errorMessage: `The field is too short. Minimum length is ${minLength}`,
        isError: (value: string) => value.trim().length < minLength
      });
    }

    // convert validators to validator objects
    this.validators = this.validators.map(function (validator) {
      if (typeof validator === "function") {
        return { isError: validator, important: true } as ValidatorObject;
      }
      return validator;
    });

    // put important validators first
    this.validators = this.validators.filter(v => v.important).concat(
        this.validators.filter(v => !v.important)
    );
  }

  componentWillReceiveProps(nextProps: Props) {
    var nextValue = this.normalize(nextProps.value);
    if (this.value !== nextValue && nextProps.hasOwnProperty('value')) {
      this.state.value = nextValue; // hackfix
      this.setValue(nextValue, true);
    }
  }

  componentDidMount() {
    this.validate();
    this.autoFitHeight();
    if (document.activeElement === this.input) {
      this.elem.classList.add(TextField.IS_FOCUSED);
    }
  }

  setDirty() {
    this.setState({ dirty: true }, this.validate);
  }

  setPristine() {
    this.setState({ dirty: false }, this.validate);
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
  onChange() {
    if (!this.props.readOnly) {
      this.value = this.input.value;
    }
  }

  @autobind()
  onBlur(evt) {
    this.props.onBlur(evt);
    this.elem.classList.remove(TextField.IS_FOCUSED);
    if (this.state.initValue !== this.value) this.setDirty();
  }

  @autobind()
  onFocus(evt) {
    this.props.onFocus(evt);
    if (this.elem) this.elem.classList.add(TextField.IS_FOCUSED);
  }

  @autobind()
  onInvalid(e: Event) {
    e.preventDefault();
  }

  @autobind()
  increment() {
    var input = this.input;
    if (input instanceof HTMLInputElement) {
      input.stepUp();
      this.value = input.valueAsNumber;
    }
  }

  @autobind()
  decrement() {
    var input = this.input;
    if (input instanceof HTMLInputElement) {
      input.stepDown();
      this.value = input.valueAsNumber;
    }
  }

  render() {
    var { className, icon, multiLine, maxLength } = this.props;
    var props: Props = omit(this.props, [
      'className', 'children', 'defaultValue', 'readOnly',
      'icon', 'multiLine', 'validators', 'showSingleError',
    ]);
    if (maxLength && multiLine) {
      // handle max-length manually for textarea cause it works incorrectly with new line symbols
      // e.g. "1\n2" value won't allow to add more text with @maxLength={4}
      delete props.maxLength;
    }
    var componentClass = cssNames('TextField', className, {
      withIcon: !!icon
    });
    var inputProps = Object.assign(props, {
      className: "input box grow",
      autoFocus: this.props.autoFocus,
      onBlur: this.onBlur,
      onFocus: this.onFocus,
      onChange: this.onChange,
      onInvalid: this.onInvalid,
      value: this.value,
      ref: e => this.input = e
    });
    var errors = this.state.dirty ? this.errors : this.errors.filter(error => error.important);
    var label = (
        <label className="label flex align-center box grow">
          {multiLine ? <textarea {...inputProps}/> : <input {...inputProps}/>}
          {icon ? <i className="icon"><MaterialIcon name={icon}/></i> : null}
        </label>
    );
    if (this.props.type === 'number') {
      label = (
          <div className="flex align-center is-number">
            <MaterialIcon name="remove_circle" className="icon" onClick={this.decrement}/>
            {label}
            <MaterialIcon name="add_circle" className="icon" onClick={this.increment}/>
          </div>
      );
    }
    return (
        <div className={componentClass} ref={e => this.elem = e}>
          <input type="hidden" disabled={props.disabled}/>
          {label}
          {maxLength ? <span className="maxLength">{this.value.length || 0} / {maxLength}</span> : null}
          <div className="errors">
            {errors.map((error, i) => <div key={i} className="error">{error.message}</div>)}
          </div>
        </div>
    );
  }
}

export default TextField;