import * as styles from "./icon.module.scss";
import uniqueId from "lodash/uniqueId";
import React, { type ReactNode } from "react";
import { base64Decode, cssNames } from "@/utils";
import { Tooltip, TooltipProps } from "../tooltip";

export interface IconProps extends React.HTMLAttributes<any> {
  material?: string;          // material-icon, see available names at https://material.io/icons/
  svg?: string;               // ./%filename%.svg or base64-encoded xml-svg content
  htmlFor?: string;           // render icon as <label htmlFor="id">
  href?: string;              // render icon as a link <a href="">
  size?: string | number;     // icon-size
  small?: boolean;            // pre-defined icon-size
  big?: boolean;              // pre-defined icon-size
  active?: boolean;           // apply active-state styles
  interactive?: boolean;      // indicates that icon is interactive and highlight it on focus/hover
  colorful?: boolean;          // applicable only for svg-icons
  disabled?: boolean;
  tooltip?: ReactNode | Omit<TooltipProps, "anchorId">; // TODO: move to proper decorator / wrapper (?)
}

export class Icon extends React.PureComponent<IconProps> {
  public elem?: HTMLElement;
  public iconId = this.props.id ?? (
    this.props.tooltip ? uniqueId(`icon_tooltip`) : undefined
  );

  get isInteractive() {
    const { interactive, onClick, href } = this.props;

    return interactive ?? !!(onClick || href);
  }

  onClick = (evt: React.MouseEvent) => {
    if (this.props.disabled) {
      return;
    }

    if (this.props.onClick) {
      this.props.onClick(evt);
    }
  }

  onKeyDown = (evt: React.KeyboardEvent<any>) => {
    switch (evt.nativeEvent.code) {
    case "Space":

      // fallthrough
    case "Enter": {
      this.elem?.click();
      evt.preventDefault();
      break;
    }
    }

    if (this.props.onKeyDown) {
      this.props.onKeyDown(evt);
    }
  }

  protected bindRef = (elem: HTMLElement) => {
    this.elem = elem;
  }

  render() {
    const { isInteractive } = this;
    const {
      // skip passing props to icon's html element
      className, href, material, svg, size, small, big, disabled, active, colorful,
      children, tooltip, htmlFor,
      interactive: _interactive,
      onClick: _onClick,
      onKeyDown: _onKeyDown,
      ...elemProps
    } = this.props;

    let iconContent: ReactNode;

    const iconProps: Partial<IconProps & { ref?: React.Ref<HTMLElement | any> }> = {
      id: this.iconId,
      className: cssNames(styles.Icon, className, {
        [styles.svg]: svg,
        [styles.material]: material,
        [styles.interactive]: isInteractive,
        [styles.disabled]: disabled,
        [styles.active]: active,
        [styles.small]: small,
        [styles.big]: big,
        [styles.colorful]: colorful,
      }),
      onClick: isInteractive ? this.onClick : undefined,
      onKeyDown: isInteractive ? this.onKeyDown : undefined,
      tabIndex: isInteractive && !disabled ? 0 : undefined,
      style: size ? { "--icon-size": `${size}${typeof size === "number" ? "px" : ""}` } as React.CSSProperties : undefined,
      ref: this.bindRef,
      ...elemProps,
    };

    // render as inline svg-icon
    if (typeof svg === "string") {
      const dataUrlPrefix = "data:image/svg+xml;base64,";
      const svgIconDataUrl = svg.startsWith(dataUrlPrefix) ? svg : require(`./${svg}.svg`);
      const svgIconText = typeof svgIconDataUrl == "string" // decode xml from data-url
        ? base64Decode(svgIconDataUrl.replace(dataUrlPrefix, "")) : "";

      iconContent = <span dangerouslySetInnerHTML={{ __html: svgIconText }}/>;
    }

    // render as material-icon
    if (typeof material === "string") {
      iconContent = <span data-icon-name={material}>{material}</span>;
    }

    // wrap icon's content passed from decorator
    iconProps.children = (
      <>
        {iconContent}
        {children}
      </>
    );

    // render icon type
    const renderIcon = () => {
      if (href) {
        return <a href={href} {...iconProps}/>;
      }
      if (htmlFor) {
        return <label htmlFor={htmlFor} {...iconProps} />;
      }

      return <i {...iconProps}/>;
    };

    const renderTooltip = () => {
      if (!tooltip) {
        return;
      }
      return (
        <Tooltip
          following={true}
          {...(typeof tooltip == "object" ? tooltip : { children: tooltip })}
          anchorId={this.iconId}
        />
      )
    }

    return (
      <>
        {renderTooltip()}
        {renderIcon()}
      </>
    )
  }
}