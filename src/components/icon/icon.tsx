import "./icon.scss";
import React, { ReactNode } from "react";
import { base64, cssNames } from "../../utils";
import { TooltipDecoratorProps, withTooltip } from "../tooltip";

export interface IconProps extends React.HTMLAttributes<any>, TooltipDecoratorProps {
  material?: string;          // material-icon, see available names at https://material.io/icons/
  svg?: string;               // svg-filename without extension in current folder
  htmlFor?: string;           // render icon as <label htmlFor="id">
  href?: string;              // render icon as a link <a href="">
  size?: string | number;     // icon-size
  small?: boolean;            // pre-defined icon-size
  smallest?: boolean;            // pre-defined icon-size
  big?: boolean;              // pre-defined icon-size
  active?: boolean;           // apply active-state styles
  interactive?: boolean;      // indicates that icon is interactive and highlight it on focus/hover
  focusable?: boolean;        // allow focus to the icon + show .active styles (default: "true", when icon is interactive)
  sticker?: boolean;
  disabled?: boolean;
}

@withTooltip
export class Icon extends React.PureComponent<IconProps> {
  private elem: HTMLElement;

  static defaultProps: IconProps = {
    focusable: true,
  };

  static isSvg(content: string) {
    return String(content).includes("svg+xml"); // data-url for raw svg-icon
  }

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
      className, href, material, svg, size, smallest, small, big,
      disabled, sticker, active, focusable, children, tooltip, htmlFor,
      interactive: _interactive,
      onClick: _onClick,
      onKeyDown: _onKeyDown,
      ...elemProps
    } = this.props;

    let iconContent: ReactNode;
    const iconProps: Partial<IconProps & { ref?: React.Ref<any> }> = {
      className: cssNames("Icon", className,
        { svg, material, interactive: isInteractive, disabled, sticker, active, focusable },
        !size ? { smallest, small, big } : {},
      ),
      onClick: isInteractive ? this.onClick : undefined,
      onKeyDown: isInteractive ? this.onKeyDown : undefined,
      tabIndex: isInteractive && focusable && !disabled ? 0 : undefined,
      style: size ? { "--size": size + (+size ? "px" : "") } as React.CSSProperties : undefined,
      ref: this.bindRef,
      ...elemProps,
    };

    // render as inline svg-icon
    if (typeof svg === "string") {
      const dataUrlPrefix = "data:image/svg+xml;base64,";
      const svgIconDataUrl = svg.startsWith(dataUrlPrefix) ? svg : require(`./${svg}.svg`);
      const svgIconText = typeof svgIconDataUrl == "string" // decode xml from data-url
        ? base64.decode(svgIconDataUrl.replace(dataUrlPrefix, "")) : "";

      iconContent = <span className="icon" dangerouslySetInnerHTML={{ __html: svgIconText }}/>;
    }

    // render as material-icon
    if (typeof material === "string") {
      iconContent = <span className="icon" data-icon-name={material}>{material}</span>;
    }

    // wrap icon's content passed from decorator
    iconProps.children = (
      <>
        {iconContent}
        {children}
      </>
    );

    // render icon type
    if (href) {
      return <a href={href} {...iconProps}/>;
    }
    if (htmlFor) {
      return <label htmlFor={htmlFor} {...iconProps} />;
    }

    return <i {...iconProps}/>;
  }
}