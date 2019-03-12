import './tooltip.scss'

import React from "react"
import { createPortal } from "react-dom"
import { autobind, cssNames } from "../../utils";
import { Animate } from "../animate";

export interface TooltipProps {
  htmlFor?: string;
  className?: string;
  usePortal?: boolean;
  useAnimation?: boolean;
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
    usePortal: false,
    useAnimation: true,
    nowrap: true,
    position: {
      center: true,
      bottom: true,
    }
  }

  public anchor: HTMLElement;
  public elem: HTMLElement;
  public state: State = {
    visible: false,
  };

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
    if (!this.props.following) {
      return;
    }

    var offset = 10;
    var { clientX, clientY } = evt;
    this.elem.style.left = (clientX + offset) + "px"
    this.elem.style.top = (clientY + offset) + "px"

    // correct position if not fits to viewport
    var { innerWidth, innerHeight } = window;
    var { right, bottom, width, height } = this.elem.getBoundingClientRect();

    if (right > innerWidth) {
      this.elem.style.left = (clientX - width - offset) + "px"
    }
    if (bottom > innerHeight) {
      this.elem.style.top = (clientY - height - offset) + "px"
    }
  }

  @autobind()
  bindRef(elem: HTMLElement) {
    this.elem = elem;
  }

  render() {
    var { visible } = this.state;
    var { className, usePortal, useAnimation, position, following, nowrap, children } = this.props;
    className = cssNames('Tooltip', position, { following, nowrap }, className);
    var tooltip = (
      <Animate enter={visible} enabled={useAnimation}>
        <div className={className} ref={this.bindRef}>
          {visible && children}
        </div>
      </Animate>
    );
    if (usePortal && following) {
      return createPortal(tooltip, document.body);
    }
    return tooltip;
  }
}