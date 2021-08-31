import './tooltip.scss'

import React from "react"
import { observer } from "mobx-react";
import { makeObservable, observable } from "mobx";
import { createPortal } from "react-dom"
import { autoBind, cssNames } from "../../utils";
import { Animate } from "../animate";

export interface TooltipProps {
  htmlFor: string
  className?: string;
  position?: Position;
  useAnimation?: boolean;
  following?: boolean; // tooltip is following mouse position
  nowrap?: boolean; // css-shortcut for style={{whiteSpace: "nowrap"}}
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

interface Position {
  left?: boolean;
  right?: boolean
  top?: boolean
  bottom?: boolean
  center?: boolean;
}

const defaultProps: Partial<TooltipProps> = {
  useAnimation: true,
  position: {
    center: true,
    bottom: true,
  }
};

@observer
export class Tooltip extends React.Component<TooltipProps> {
  static defaultProps = defaultProps as object;

  public anchor: HTMLElement;
  public elem: HTMLElement;
  public lastMousePos = { x: 0, y: 0 };
  @observable isVisible = false;

  constructor(props: TooltipProps) {
    super(props);

    autoBind(this);
    makeObservable(this);
  }

  componentDidMount() {
    var { htmlFor } = this.props;
    this.anchor = htmlFor ? document.getElementById(htmlFor) : this.elem.parentElement;
    if (this.anchor) {
      if (window.getComputedStyle(this.anchor).position === "static") {
        this.anchor.style.position = "relative"
      }
      this.anchor.addEventListener("mouseenter", this.onMouseEnter);
      this.anchor.addEventListener("mouseleave", this.onMouseLeave);
      this.anchor.addEventListener("mousemove", this.onMouseMove);
    }
  }

  componentWillUnmount() {
    if (this.anchor) {
      this.anchor.removeEventListener("mouseenter", this.onMouseEnter);
      this.anchor.removeEventListener("mouseleave", this.onMouseLeave);
      this.anchor.removeEventListener("mousemove", this.onMouseMove);
    }
  }

  onMouseEnter(evt: MouseEvent) {
    this.isVisible = true;
    this.onMouseMove(evt);
  }

  onMouseLeave(evt: MouseEvent) {
    this.isVisible = false;
  }

  onMouseMove(evt: MouseEvent) {
    if (!this.props.following) return;
    this.lastMousePos.x = evt.clientX;
    this.lastMousePos.y = evt.clientY;
    this.refreshPosition();
  }

  refreshPosition({ x = 0, y = 0 } = this.lastMousePos) {
    if (!this.props.following) {
      return;
    }
    var offset = 10;
    var viewportWidth = document.documentElement.clientWidth;
    var viewportHeight = document.documentElement.clientHeight;

    var style = this.elem.style;
    style.left = x + offset + "px"
    style.top = y + offset + "px"

    // correct position if not fitting to viewport
    var { right, bottom, width, height } = this.elem.getBoundingClientRect();
    var leftMirrorPos = x - width - offset;
    var topMirrorPos = y - height - offset;

    if (right > viewportWidth && leftMirrorPos > 0) {
      style.left = leftMirrorPos + "px"
    }
    if (bottom > viewportHeight) {
      style.top = topMirrorPos + "px";
    }
  }

  bindRef(elem: HTMLElement) {
    this.elem = elem;
  }

  render() {
    var { isVisible } = this;
    var { className, useAnimation, position, following, nowrap, style, children } = this.props;
    className = cssNames('Tooltip', position, { following, nowrap }, className);
    var content = (
      <div className={className} ref={this.bindRef} style={style}>
        {children}
      </div>
    );
    var tooltip = content;
    if (useAnimation) {
      tooltip = (
        <Animate enter={isVisible} onEnter={() => this.refreshPosition()}>
          {content}
        </Animate>
      )
    } else if (!isVisible) {
      return null;
    }
    if (following) {
      return createPortal(tooltip, document.body);
    }
    return tooltip;
  }
}