import * as styles from "./tabs.module.scss";
import * as React from "react";
import { cssNames, IClassName } from "../../utils";
import { Icon } from "../icon";

const TabsContext = React.createContext<TabsContextValue>(null);
type TabsContextValue = TabsProps;

export interface TabsProps<D = any> extends Omit<React.DOMAttributes<HTMLElement>, "onChange"> {
  value?: D;
  autoFocus?: boolean;
  className?: string;
  center?: boolean;
  wrap?: boolean;
  scrollable?: boolean;
  onChange?(value: D): void;
}

export class Tabs extends React.Component<TabsProps> {
  public elem: HTMLElement;

  protected bindRef = (elem: HTMLElement) => {
    this.elem = elem;
  }

  render() {
    var { className, center, wrap, scrollable, onChange, value, autoFocus, ...elemProps } = this.props;
    return (
      <TabsContext.Provider value={this.props}>
        <div
          {...elemProps}
          className={cssNames(styles.Tabs, className, {
            [styles.center]: center,
            [styles.wrap]: wrap,
            [styles.scrollable]: scrollable,
          })}
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
  labelClass?: IClassName;
  value: D;
}

export class Tab extends React.PureComponent<TabProps> {
  static contextType = TabsContext;
  declare context: TabsContextValue;
  public elem: HTMLElement;

  componentDidMount() {
    var { autoFocus } = this.context;
    if (this.isActive && autoFocus) {
      this.focus();
    }
  }

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

  onClick = (evt: React.MouseEvent<HTMLElement>) => {
    var { value, active, disabled, onClick } = this.props;
    var { onChange } = this.context;
    if (disabled || active) return;
    if (onClick) onClick(evt);
    if (onChange) onChange(value);
  }

  onFocus = (evt: React.FocusEvent<HTMLElement>) => {
    var { scrollable } = this.context;
    var { onFocus } = this.props;
    if (onFocus) onFocus(evt);
    if (scrollable) this.scrollIntoView();
  }

  onKeyDown = (evt: React.KeyboardEvent<HTMLElement>) => {
    switch (evt.nativeEvent.code) {
      case "Enter":
      case "Space":
        this.elem.click();
        evt.preventDefault(); // avoid page scrolling
        break;
    }
    if (this.props.onKeyDown) {
      this.props.onKeyDown(evt);
    }
  }

  protected bindRef = (elem: HTMLElement) => {
    this.elem = elem;
  }

  render() {
    var { className, active, icon, disabled, label, labelClass, value, ...elemProps } = this.props;
    const tabClass = cssNames(styles.Tab, className, {
      [styles.active]: this.isActive,
      [styles.disabled]: disabled,
    });
    return (
      <div
        {...elemProps}
        className={tabClass}
        tabIndex={0} // make focusable
        onClick={this.onClick}
        onFocus={this.onFocus}
        onKeyDown={this.onKeyDown}
        ref={this.bindRef}
      >
        {typeof icon === "string" ? <Icon small material={icon}/> : icon}
        <div className={cssNames(labelClass)}>{label}</div>
      </div>
    )
  }
}
