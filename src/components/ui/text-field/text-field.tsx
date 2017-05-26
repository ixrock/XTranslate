import "./text-field.scss";
import * as React from "react";
import { autobind } from "core-decorators";
import { cssNames, noop } from "../../../utils";
import { MaterialIcon } from "../icons/material-icon";

type TextValue = string | number;
type Validator = (value: string, props: Partial<Props>) => boolean | string | React.ReactElement<any>

type Props = React.HTMLProps<any> & {
  value: TextValue
  icon?: string;
  dirty?: boolean
  compact?: boolean
  multiLine?: boolean;
  showAllErrors?: boolean
  validators?: Validator | Validator[]
  onChange?: (value: TextValue) => void;
}

interface State {
  dirty?: boolean
  dirtyOnBlur?: boolean
  errors?: string[]
}

export class TextField extends React.Component<Props, State> {
  public elem: HTMLElement;
  public input: HTMLInputElement | HTMLTextAreaElement;
  private validators: Validator[] = [].concat(this.props.validators || []);

  public state: State = {
    dirty: this.props.dirty,
    errors: [],
  };

  static IS_FOCUSED = 'focused';
  static IS_DIRTY = 'dirty';
  static IS_INVALID = 'invalid';

  static defaultProps: Partial<Props> = {
    onChange: noop,
    onFocus: noop,
    onBlur: noop,
  };

  static baseValidators: { [prop: string]: Validator } = {
    isRequired(value, { required }) {
      if (!required) return;
      if (!value.trim()) {
        return "This field is required";
      }
    },
    isEmail(value, { type }){
      if (type !== "email") return;
      if (!value.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
        return "Wrong email format";
      }
    },
    minLength(value, { minLength }){
      if (!minLength) return;
      if (value.trim().length < minLength) {
        return `The field is too short. Minimum length is ${minLength}`;
      }
    },
    minMax(value, { min, max, type }){
      if (type !== "number") return;
      if (min != null && value < min) return `The minimum number value must be ${min}`
      if (max != null && value > max) return `The maximum number value must be ${max}`
      return "";
    }
  }

  get value() {
    var input = this.input;
    if (input) {
      var { type } = this.props;
      var isNumber = type === "number";
      if (isNumber && input instanceof HTMLInputElement) {
        var number = input.valueAsNumber;
        return !isNaN(number) ? number : 0;
      }
      return input.value;
    }
    return this.props.value != null ? this.props.value : ""
  }

  set value(value) {
    this.input.value = String(value);
    this.onChange();
  }

  get valid() {
    return !this.state.errors.length;
  }

  @autobind()
  focus() {
    if (!this.input) return;
    this.input.focus();
  }

  @autobind()
  blur() {
    if (!this.input) return;
    this.input.blur();
  }

  get isFocused() {
    return document.activeElement === this.input
  }

  componentWillMount() {
    this.initValidators();
    this.validate();
  }

  componentWillReceiveProps({ value, dirty }: Props) {
    if (this.props.dirty !== dirty) this.setDirty();
    if (this.value !== value) this.value = value;
    this.validate();
  }

  componentDidMount() {
    this.autoFitHeight();
    if (this.isFocused) {
      this.elem.classList.add(TextField.IS_FOCUSED);
    }
  }

  validate() {
    var value = this.value.toString();
    var valid = true;
    var errors = [];

    for (var validator of this.validators) {
      var error = validator(value, this.props);
      valid = valid && !error;
      if (error && error !== true) {
        errors.push(error);
        if (!this.props.showAllErrors) break;
      }
    }

    this.setState({ errors }, () => {
      this.input.setCustomValidity(valid ? "" : " ");
    });

    return valid;
  }

  setDirty(dirty = true) {
    this.setState({ dirty, dirtyOnBlur: false }, () => {
      this.validate();
    });
  }

  private initValidators() {
    var validators = TextField.baseValidators;
    Object.keys(validators).forEach(kind => this.validators.push(validators[kind]));
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
  private onBlur(evt) {
    this.elem.classList.remove(TextField.IS_FOCUSED);
    if (this.state.dirtyOnBlur) this.setDirty();
    this.props.onBlur(evt);
  }

  @autobind()
  private onFocus(evt) {
    if (this.elem) this.elem.classList.add(TextField.IS_FOCUSED);
    this.props.onFocus(evt);
  }

  @autobind()
  private onInvalid(e: Event) {
    e.preventDefault();
  }

  @autobind()
  private onChange() {
    var value = this.input.value;
    var { maxLength } = this.props;
    if (maxLength) value = value.substr(0, maxLength);
    if (value !== this.props.value) {
      this.autoFitHeight();
      var valid = this.validate();
      if (!valid && this.isFocused) this.setState({ dirtyOnBlur: true });
      this.props.onChange(this.value);
    }
  }

  @autobind()
  increment() {
    var input = this.input;
    if (input instanceof HTMLInputElement) {
      input.stepUp();
      this.onChange();
    }
  }

  @autobind()
  decrement() {
    var input = this.input;
    if (input instanceof HTMLInputElement) {
      input.stepDown();
      this.onChange();
    }
  }

  render() {
    var { className, icon, multiLine, compact, dirty, validators, showAllErrors, children, ...props } = this.props;
    var { maxLength, rows, type, autoFocus } = this.props;
    var { errors, dirty } = this.state;
    var isNumber = type === "number";

    if (maxLength && multiLine) {
      // handle max-length manually for textarea cause it works incorrectly with new line symbols
      // e.g. "1\n2" value won't allow to add more text with @maxLength={4}
      delete props.maxLength;
    }
    var inputProps = Object.assign(props, {
      className: cssNames("input box grow"),
      autoFocus: autoFocus,
      value: this.value,
      onBlur: this.onBlur,
      onFocus: this.onFocus,
      onChange: this.onChange,
      onInvalid: this.onInvalid,
      rows: multiLine ? (rows || 1) : null,
      ref: e => this.input = e
    });

    var componentClass = cssNames('TextField', className, {
      withIcon: !!icon,
      readOnly: props.readOnly,
      compact: compact && !errors.length,
      [TextField.IS_INVALID]: errors.length,
      [TextField.IS_DIRTY]: dirty,
    });
    return (
        <div className={componentClass} ref={e => this.elem = e}>
          <input type="hidden" disabled={props.disabled}/>
          <label className="label flex">
            {multiLine ? <textarea {...inputProps}/> : <input {...inputProps}/>}
            {icon ? <i className="icon"><MaterialIcon name={icon}/></i> : null}
            {isNumber ? <MaterialIcon name="arrow_drop_up" className="icon-arrow up" onClick={this.increment}/> : null}
            {isNumber ? <MaterialIcon name="arrow_drop_down" className="icon-arrow down" onClick={this.decrement}/> : null}
          </label>
          {maxLength ? <span className="maxLength">{this.value.toString().length || 0} / {maxLength}</span> : null}
          <div className="errors">
            {dirty ? errors.map((error, i) => {
              return <div key={i} className="error">{error}</div>
            }) : null}
          </div>
        </div>
    );
  }
}
