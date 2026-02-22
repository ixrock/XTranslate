import * as styles from './menu-item.module.scss'
import React from "react";
import { autoBind, cssNames } from "@/utils";
import { Icon } from "../icon";
import { MenuContext, MenuContextValue } from "./menu-context";

export interface MenuItemProps extends React.HTMLProps<any> {
  icon?: React.ReactNode;
  disabled?: boolean
  active?: boolean
  spacer?: boolean;
  href?: string;
}

export class MenuItem extends React.Component<MenuItemProps> {
  static contextType = MenuContext;
  declare context: MenuContextValue;
  public elem: HTMLElement;

  constructor(props: MenuItemProps) {
    super(props);
    autoBind(this);
  }

  get isFocusable() {
    var { disabled, spacer } = this.props;
    return !(disabled || spacer);
  }

  onClick(evt: React.MouseEvent) {
    if (this.props.spacer) return;
    this.props.onClick?.(evt);

    var menu = this.context;
    if (menu && menu.props.closeOnItemClick) {
      menu.close();
    }
  }

  protected bindRef(elem: HTMLElement) {
    this.elem = elem;
  }

  render() {
    var { className, disabled, active, spacer, icon, children, ...props } = this.props;
    if (typeof icon === "string") {
      icon = <Icon className={styles.icon} material={icon}/>;
    }
    var elemProps: React.HTMLProps<any> = {
      tabIndex: this.isFocusable ? 0 : -1,
      ...props,
      className: cssNames(styles.MenuItem, className, {
        [styles.disabled]: disabled,
        [styles.active]: active,
        [styles.spacer]: spacer,
      }),
      onClick: this.onClick,
      children: icon ? <>{icon} {children}</> : children,
      ref: this.bindRef,
    }
    if (elemProps.href) {
      return <a {...elemProps}/>
    }
    if (elemProps.htmlFor) {
      return <label {...elemProps}/>
    }
    return <li {...elemProps}/>
  }
}