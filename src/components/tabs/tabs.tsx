import "./tabs.scss";
import * as React from "react";
import { autobind, cssNames } from "../../utils";
import { Icon } from "../icon";

const TabsContext = React.createContext<TabsContextValue>({});

export interface TabsContextValue<D = any> {
  autoFocus?: boolean;
  value?: D;
  onChange?(value: D): void;
}

export type TabsProps<D = any> = TabsContextValue<D> & React.DOMAttributes<HTMLElement> & {
  className?: string;
  center?: boolean;
  wrap?: boolean;
  scrollable?: boolean;
}

export class Tabs extends React.PureComponent<TabsProps> {
  public elem: HTMLElement;

  static defaultProps: Partial<TabsProps> = {
    scrollable: true,
  }

  @autobind()
  protected bindRef(elem: HTMLElement) {
    this.elem = elem;
  }

  render() {
    var { className, center, wrap, scrollable, onChange, value, autoFocus, ...elemProps } = this.props;
    return (
      <TabsContext.Provider value={{ autoFocus, value, onChange }}>
        <div
          {...elemProps}
          className={cssNames("Tabs", className, { center, wrap, scrollable })}
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
  public context: TabsContextValue;
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
    var ENTER_KEY = evt.nativeEvent.code === "Enter";
    var SPACE_KEY = evt.nativeEvent.code === "Space";
    if (SPACE_KEY || ENTER_KEY) this.elem.click();
    var { onKeyDown } = this.props;
    if (onKeyDown) onKeyDown(evt);
  }

  componentDidMount() {
    var { autoFocus } = this.context;
    if (this.isActive && autoFocus) {
      this.focus();
    }
  }

  @autobind()
  protected bindRef(elem: HTMLElement) {
    this.elem = elem;
  }

  render() {
    var { className, active, icon, disabled, label, value, ...elemProps } = this.props;
    className = cssNames("Tab flex gaps align-center", className, {
      active: this.isActive,
      disabled: disabled,
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
        {typeof icon === "string" ? <Icon small material={icon}/> : icon}
        <div className="label">{label}</div>
      </div>
    )
  }
}
