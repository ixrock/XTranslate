import "./menu-actions.scss"

import React, { isValidElement } from "react";
import { cssNames } from "../../utils";
import { Icon, IconProps } from "../icon";
import { Menu, MenuProps } from "../menu";
import uniqueId from "lodash/uniqueId";
import isString from "lodash/isString";

export interface MenuActionsProps extends Partial<MenuProps> {
  className?: string;
  toolbar?: boolean; // display menu as toolbar with icons
  triggerIcon?: string | IconProps | React.ReactNode;
}

export class MenuActions extends React.Component<MenuActionsProps> {
  public id = uniqueId("menu_actions_");

  renderTriggerIcon() {
    var { triggerIcon = "more_vert" } = this.props;
    if (isValidElement(triggerIcon)) {
      return React.cloneElement(triggerIcon, { id: this.id } as any);
    }
    var iconProps: Partial<IconProps> = {
      id: this.id,
      actionIcon: true,
      material: isString(triggerIcon) ? triggerIcon : undefined,
      ...(typeof triggerIcon === "object" ? triggerIcon : {})
    }
    return (
      <Icon {...iconProps}/>
    )
  }

  render() {
    var { className, toolbar, triggerIcon, children, ...menuProps } = this.props;
    className = cssNames("MenuActions flex", className, { toolbar })
    if (toolbar) {
      return <ul className={className} children={children}/>
    }
    return (
      <>
        {this.renderTriggerIcon()}
        <Menu htmlFor={this.id} className={className} usePortal closeOnScroll {...menuProps}>
          {children}
        </Menu>
      </>
    )
  }
}
