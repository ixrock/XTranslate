import './icon.scss'

import React, { isValidElement } from "react";
import { autobind, cssNames } from "../../utils";
import { Tooltip, TooltipProps } from "../tooltip";
import uniqueId from "lodash/uniqueId"
import isPlainObject from "lodash/isPlainObject"
import isNumber from "lodash/isNumber"

export type IconProps = React.HTMLProps<any> & {
  material?: string;          // material-icon, see available names at https://material.io/icons/
  svg?: string;               // svg-filename without extension in current folder
  actionIcon?: boolean;       // indicates that icon is interactive and highlight it on hover
  colorful?: boolean;         // has effect only for svg icons: don't fill internal elements to current css-color
  href?: string;              // render icon as hyperlink
  tooltip?: React.ReactNode | Partial<TooltipProps>;  // add tooltip on hover
  size?: string | number;     // icon-size
  small?: boolean;
  big?: boolean;
  disabled?: boolean;
}

export class Icon extends React.Component<IconProps> {
  public elem: HTMLElement;

  public tooltipId = this.props.id || (
    this.props.tooltip ? uniqueId("icon_tooltip_") : undefined
  );

  get isActionIcon() {
    var { actionIcon, onClick, href } = this.props;
    return actionIcon || !!(onClick || href);
  }

  @autobind()
  onKeyDown(evt: React.KeyboardEvent<any>) {
    switch (evt.nativeEvent.code) {
      case "Space":
      case "Enter":
        this.elem.click();
        evt.preventDefault(); // e.g. prevent page scrolling
        break;
    }
  }

  @autobind()
  bindRef(elem: HTMLElement) {
    this.elem = elem;
  }

  render() {
    var { className, href, material, svg, colorful, actionIcon, tooltip, size, small, big, style, disabled, ...elemProps } = this.props;
    actionIcon = this.isActionIcon;
    if (size) {
      style = style || {};
      style["--size"] = size + (isNumber(size) ? "px" : "");
    }
    var iconProps: Partial<IconProps> = {
      id: this.tooltipId,
      className: cssNames("Icon", className,
        { svg, material, actionIcon, disabled, colorful },
        !size ? { small, big } : {}
      ),
      onKeyDown: actionIcon ? this.onKeyDown : undefined,
      tabIndex: actionIcon ? 0 : undefined,
      style: style,
      ref: this.bindRef,
      ...elemProps
    };

    // render as inline svg-icon
    if (svg) {
      var svgIcon = require("!!raw-loader!./" + svg + ".svg");
      iconProps.children = <span dangerouslySetInnerHTML={{ __html: svgIcon }}/>;
    }

    // render as material-icon
    if (material) {
      iconProps.children = <span>{material}</span>;
    }

    // add tooltip
    if (tooltip) {
      var iconContent = iconProps.children;
      var tooltipProps: Partial<TooltipProps> = {
        htmlFor: this.tooltipId,
        following: true,
      };
      if (isPlainObject(tooltip) && !isValidElement(tooltip)) {
        Object.assign(tooltipProps, tooltip);
      }
      else {
        tooltipProps.children = tooltip;
      }
      iconProps.children = (
        <>
          {iconContent}
          <Tooltip {...tooltipProps}/>
        </>
      )
    }
    return href
      ? <a {...iconProps} href={href}/>
      : <i {...iconProps} />
  }
}