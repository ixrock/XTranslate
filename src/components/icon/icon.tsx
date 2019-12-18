import './icon.scss'

import React, { ReactNode } from "react";
import { findDOMNode } from "react-dom";
import { autobind, cssNames } from "../../utils";
import { TooltipDecoratorProps, withTooltip } from "../tooltip";
import isNumber from "lodash/isNumber"

export interface IconProps extends React.HTMLAttributes<any>, TooltipDecoratorProps {
  material?: string;          // material-icon, see available names at https://material.io/icons/
  svg?: string;               // svg-filename without extension in current folder
  colorful?: boolean;         // has effect only for svg icons: don't fill internal elements to current css-color
  href?: string;              // render icon as hyperlink
  size?: string | number;     // icon-size
  small?: boolean;            // pre-defined icon-size
  big?: boolean;              // pre-defined icon-size
  active?: boolean;           // apply active-state styles
  interactive?: boolean;      // indicates that icon is interactive and highlight it on focus/hover
  focusable?: boolean;        // allow focus to the icon + show .active styles (default: "true", when icon is interactive)
  sticker?: boolean;
  disabled?: boolean;
}

@withTooltip
export class Icon extends React.PureComponent<IconProps> {
  static defaultProps: IconProps = {
    focusable: true,
  };

  get isInteractive() {
    var { interactive, onClick, href } = this.props;
    return interactive || !!(onClick || href);
  }

  @autobind()
  onClick(evt: React.MouseEvent) {
    if (this.props.disabled) {
      return;
    }
    if (this.props.onClick) {
      this.props.onClick(evt);
    }
  }

  @autobind()
  onKeyDown(evt: React.KeyboardEvent<any>) {
    switch (evt.nativeEvent.code) {
      case "Space":
      case "Enter":
        var icon = findDOMNode(this) as HTMLElement;
        setTimeout(() => icon.click());
        evt.preventDefault();
        break;
    }
    if (this.props.onKeyDown) {
      this.props.onKeyDown(evt);
    }
  }

  render() {
    var { isInteractive } = this;
    var {
      // skip passing props to icon's html element
      className, href, colorful, material, svg, size, small, big,
      disabled, sticker, active, focusable, children, tooltip,
      interactive: _interactive,
      onClick: _onClick,
      onKeyDown: _onKeyDown,
      ...elemProps
    } = this.props;

    var iconContent: ReactNode;
    var iconProps: Partial<IconProps> = {
      className: cssNames("Icon", className, {
          svg, material, disabled, sticker, active, focusable, colorful,
          interactive: isInteractive,
        },
        !size ? { small, big } : {}
      ),
      onClick: isInteractive ? this.onClick : undefined,
      onKeyDown: isInteractive ? this.onKeyDown : undefined,
      tabIndex: isInteractive && focusable && !disabled ? 0 : undefined,
      style: size ? { "--size": size + (isNumber(size) ? "px" : "") } as React.CSSProperties : undefined,
      ...elemProps,
    };

    // render as inline svg-icon
    if (svg) {
      var svgIconText = require("!!raw-loader!./" + svg + ".svg").default;
      iconContent = <span dangerouslySetInnerHTML={{ __html: svgIconText }}/>;
    }

    // render as material-icon
    if (material) {
      iconContent = <span className="material-icons">{material}</span>;
    }

    // wrap icon's content passed from decorator
    iconProps.children = (
      <>
        {tooltip}
        {iconContent}
      </>
    );

    // render icon type
    if (href) {
      return <a {...iconProps} href={href}/>
    }
    return <i {...iconProps}/>
  }
}