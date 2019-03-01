import './tooltip.scss'

import React from "react"
import { createPortal } from "react-dom"
import { autobind, cssNames } from "../../utils";

export interface TooltipProps {
  htmlFor: string
  className?: string;
  following?: boolean;
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

    var offset = 15;
    var { pageX, pageY } = evt;
    this.elem.style.left = (pageX + offset) + "px"
    this.elem.style.top = (pageY + offset) + "px"

    // correct position if not fits to viewport
    var { innerWidth: viewportWidth, innerHeight: viewportHeight } = window;
    var { right, bottom, width, height } = this.elem.getBoundingClientRect();
    if (right > viewportWidth) {
      this.elem.style.left = (pageX - width - offset / 2) + "px"
    }
    if (bottom > viewportHeight) {
      this.elem.style.top = (pageY - height - offset / 2) + "px"
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
    var { className, position, following, children } = this.props;
    className = cssNames('Tooltip', position, { following }, className);
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