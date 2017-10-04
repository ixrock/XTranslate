import './tooltip.scss'
import * as React from 'react'
import { autobind } from "core-decorators"
import { cssNames } from "../../../utils";

interface Props extends React.HTMLProps<any> {
  htmlFor: string
  following?: boolean
}

interface State {
}

export class Tooltip extends React.Component<Props, State> {
  private anchor: HTMLElement;
  private tooltip: HTMLElement;

  static IS_VISIBLE = "visible";
  static IS_FOLLOWING = "following";

  componentDidMount() {
    var { htmlFor, following } = this.props;
    this.anchor = document.getElementById(htmlFor);
    if (this.anchor) {
      this.anchor.addEventListener("mouseenter", this.onMouseEnter);
      this.anchor.addEventListener("mouseleave", this.onMouseLeave);
      if (following) {
        this.anchor.addEventListener("mousemove", this.onMouseMove);
        this.tooltip.classList.add(Tooltip.IS_FOLLOWING);
      }
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
    this.tooltip.classList.add(Tooltip.IS_VISIBLE);
  }

  @autobind()
  onMouseLeave(evt: MouseEvent) {
    this.tooltip.classList.remove(Tooltip.IS_VISIBLE);
  }

  @autobind()
  onMouseMove({ pageX, pageY }: MouseEvent) {
    var offset = 10;
    this.tooltip.style.left = (pageX + offset) + "px"
    this.tooltip.style.top = (pageY + offset) + "px"

    // tooltip position correction
    var viewportWidth = window.innerWidth;
    var viewportHeight = window.innerHeight;
    var tooltipRect = this.tooltip.getBoundingClientRect();
    if (tooltipRect.right > viewportWidth) {
      this.tooltip.style.left = (pageX - tooltipRect.width - offset / 2) + "px"
    }
    if (tooltipRect.bottom > viewportHeight) {
      this.tooltip.style.top = (pageY - tooltipRect.height - offset / 2) + "px"
    }
  }

  render() {
    const className = cssNames('Tooltip', this.props.className);
    return (
      <div className={className} ref={e => this.tooltip = e}>
        {this.props.children}
      </div>
    );
  }
}