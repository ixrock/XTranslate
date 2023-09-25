import styles from './tooltip.module.scss'
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
  following?: boolean; // tooltip is following mouse position (rendered outside of components's root element)
  parentElement?: HTMLElement; // default: document.body
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
  get parentElement() {
    return document.body;
  },
  position: {
    center: true,
    bottom: true,
  }
};

@observer
export class Tooltip extends React.Component<TooltipProps> {
  static defaultProps = defaultProps as object;

  public elem: HTMLElement | undefined;
  public lastMousePos = { x: 0, y: 0 };
  @observable isVisible = false;

  constructor(props: TooltipProps) {
    super(props);
    makeObservable(this);
    autoBind(this);
  }

  get anchor(): HTMLElement | undefined {
    var { htmlFor } = this.props;
    return htmlFor ? document.getElementById(htmlFor) : this.elem?.parentElement;
  }

  componentDidMount() {
    if (!this.anchor) return;

    if (window.getComputedStyle(this.anchor).position === "static") {
      this.anchor.style.position = "relative"
    }
    this.anchor.addEventListener("mouseenter", this.onMouseEnter);
    this.anchor.addEventListener("mouseleave", this.onMouseLeave);
    this.anchor.addEventListener("mousemove", this.onMouseMove);
  }

  componentWillUnmount() {
    if (!this.anchor) return;

    this.anchor.removeEventListener("mouseenter", this.onMouseEnter);
    this.anchor.removeEventListener("mouseleave", this.onMouseLeave);
    this.anchor.removeEventListener("mousemove", this.onMouseMove);
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

  refreshPosition = () => requestAnimationFrame(() => {
    if (!this.props.following || !this.elem) return;

    var offset = 10;
    var viewportWidth = document.documentElement.clientWidth;
    var viewportHeight = document.documentElement.clientHeight;

    var style = this.elem.style;
    var { x = 0, y = 0 } = this.lastMousePos;
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
  });

  bindRef(elem: HTMLElement) {
    this.elem = elem;
  }

  render() {
    var { className, position, following, nowrap, style, children, parentElement } = this.props;

    className = cssNames(styles.Tooltip, {
      [styles.left]: position.left,
      [styles.top]: position.top,
      [styles.right]: position.right,
      [styles.bottom]: position.bottom,
      [styles.center]: position.center,
      [styles.following]: following,
      [styles.nowrap]: nowrap,
    }, className);

    var tooltip = (
      <Animate enter={this.isVisible} onEnter={this.refreshPosition}>
        <div className={className} ref={this.bindRef} style={style}>
          {children}
        </div>
      </Animate>
    );

    if (following) {
      return createPortal(tooltip, parentElement);
    }
    return tooltip;
  }
}