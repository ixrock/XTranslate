import "./tabs.scss";
import * as React from "react";
import { autobind, cssNames } from "../../utils";

interface Context<D = any> {
  autoFocus?: boolean;
  value?: D;
  onChange?(value: D): void;
}

var TabsContext = React.createContext<Context>({});

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

export interface TabsProps<D = any> extends Context<D>, Omit<React.DOMAttributes<HTMLElement>, "onChange"> {
  className?: string;
  center?: boolean;
  wrap?: boolean;
  scrollable?: boolean;
}

export class Tabs extends React.PureComponent<TabsProps> {
  public elem: HTMLElement;

  @autobind()
  onWheel(evt: React.WheelEvent) {
    evt.preventDefault();
    this.elem.scrollLeft += (evt.deltaX + evt.deltaY);
  }

  @autobind()
  protected bindRef(elem: HTMLElement) {
    this.elem = elem;
  }

  render() {
    var {
      className, center, wrap, onChange, value, autoFocus,
      scrollable = true,
      ...elemProps
    } = this.props;
    className = cssNames("Tabs", className, {
      "center": center,
      "wrap": wrap,
      "scrollable": scrollable,
    });
    return (
      <TabsContext.Provider value={{ autoFocus, value, onChange }}>
        <div
          {...elemProps}
          className={className}
          onWheel={this.onWheel}
          ref={this.bindRef}
        />
      </TabsContext.Provider>
    )
  }
}

export interface TabProps<D = any> extends React.DOMAttributes<HTMLElement> {
  className?: string;
  active?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode | string; // material-ui name or custom icon
  label?: React.ReactNode;
  value: D;
}

export class Tab extends React.PureComponent<TabProps> {
  static contextType = TabsContext;
  public context: Context;
  public elem: HTMLElement;

  get isActive() {
    var { active, value } = this.props;
    return typeof active === "boolean" ? active : this.context.value === value;
  }

  focus() {
    this.elem.focus();
  }

  scrollIntoView() {
    this.elem.scrollIntoView({
      behavior: "smooth",
      inline: "center",
    });
  }

  @autobind()
  onClick(evt: React.MouseEvent<HTMLElement>) {
    var { value, active, disabled, onClick } = this.props;
    var { onChange } = this.context;
    if (disabled || active) return;
    if (onClick) onClick(evt);
    if (onChange) onChange(value);
  }

  @autobind()
  onFocus(evt: React.FocusEvent<HTMLElement>) {
    var { onFocus } = this.props;
    if (onFocus) onFocus(evt);
    this.scrollIntoView();
  }

  @autobind()
  onKeyDown(evt: React.KeyboardEvent<HTMLElement>) {
    var ENTER_KEY = evt.keyCode === 13;
    var SPACE_KEY = evt.keyCode === 32;
    if (SPACE_KEY || ENTER_KEY) this.elem.click();
    var { onKeyDown } = this.props;
    if (onKeyDown) onKeyDown(evt);
  }

  componentDidMount() {
    if (this.isActive && this.context.autoFocus) {
      this.focus();
    }
  }

  @autobind()
  protected bindRef(elem: HTMLElement) {
    this.elem = elem;
  }

  render() {
    var { className, active, disabled, label, value, ...elemProps } = this.props;
    className = cssNames("Tab flex gaps align-center", className, {
      "active": this.isActive,
      "disabled": disabled,
    });
    return (
      <div
        {...elemProps}
        className={className}
        tabIndex={0}
        onClick={this.onClick}
        onFocus={this.onFocus}
        onKeyDown={this.onKeyDown}
        ref={this.bindRef}
      >
        <div className="label">{label}</div>
      </div>
    )
  }
}
