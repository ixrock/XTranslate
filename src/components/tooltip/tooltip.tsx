import './tooltip.scss'

import React from "react"
import { createPortal } from "react-dom"
import { autobind, cssNames } from "../../utils";

export interface TooltipProps {
  htmlFor: string
  className?: string;
  following?: boolean;  // tooltip is following mouse position
  nowrap?: boolean;     // apply css: "white-space: nowrap"
  position?: Position;
  children?: React.ReactNode;
}

interface Position {
  left?: boolean;
  right?: boolean
  top?: boolean
  bottom?: boolean
  center?: boolean;
}

interface State {
  visible?: boolean;
}

export class Tooltip extends React.Component<TooltipProps, State> {
  static defaultProps: Partial<TooltipProps> = {
    nowrap: true,
    position: {
      center: true,
      bottom: true,
    }
  }

  public anchor: HTMLElement;
  public elem: HTMLElement;
  public state: State = {};

  componentDidMount() {
    this.anchor = document.getElementById(this.props.htmlFor);
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

  @autobind()
  onMouseEnter(evt: MouseEvent) {
    this.setState({ visible: true });
    this.onMouseMove(evt);
  }

  @autobind()
  onMouseLeave(evt: MouseEvent) {
    this.setState({ visible: false });
  }

  @autobind()
  onMouseMove(evt: MouseEvent) {
    if (!this.props.following) return;

    var offset = 10;
    var { pageX, pageY } = evt;
    this.elem.style.left = (pageX + offset) + "px"
    this.elem.style.top = (pageY + offset) + "px"

    // correct position if not fits to viewport
    var { innerWidth, innerHeight } = window;
    var { right, bottom, width, height } = this.elem.getBoundingClientRect();

    if (right > innerWidth) {
      this.elem.style.left = (pageX - width - offset) + "px"
    }
    if (bottom > innerHeight) {
      this.elem.style.top = (pageY - height - offset) + "px"
    }
  }

  @autobind()
  bindRef(elem: HTMLElement) {
    this.elem = elem;
  }

  render() {
    if (!this.state.visible) {
      return null;
    }
    var { className, position, following, nowrap, children } = this.props;
    className = cssNames('Tooltip', position, { following, nowrap }, className);
    var tooltip = (
      <div
        className={className}
        children={children}
        ref={this.bindRef}
      />
    )
    return following
      ? createPortal(tooltip, document.body)
      : tooltip;
  }
}