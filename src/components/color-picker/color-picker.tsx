import "./color-picker.scss";

import * as React from 'react'
import { cssNames, noop } from "../../utils";
import { Color, ColorValue, cssColor } from "./cssColor";
import ChromePicker from "react-color/lib/Chrome"

interface Props {
  className?: any
  disabled?: boolean
  position?: "top left" | "top right" | "bottom left" | "bottom right"
  value?: ColorValue
  onChange?(color: ColorValue): void;
}

export class ColorPicker extends React.Component<Props> {
  private elem: HTMLElement;
  private handler: HTMLElement;

  public state = {
    visible: false,
    color: this.props.value,
  };

  static defaultProps: Props = {
    position: "bottom left",
    value: "#fff",
    onChange: noop,
  };

  componentWillReceiveProps(nextProps: Props) {
    if (this.value !== nextProps.value && nextProps.hasOwnProperty('value')) {
      this.setValue(nextProps.value, true);
    }
  }

  componentWillUnmount() {
    this.unbindEvents();
  }

  get value() {
    return this.state.color;
  }

  set value(color) {
    this.setValue(color);
  }

  setValue(color, silent = false) {
    this.setState({ color });
    if (!silent) this.props.onChange(color);
  }

  toggle(visible = !this.state.visible) {
    this.setState({ visible }, this.bindEvents);
  }

  private onClickWindow = (e: MouseEvent) => {
    var target = e.target as HTMLElement;
    if (target !== this.handler && !target.closest('.chrome-picker')) {
      this.toggle(false);
    }
  }

  bindEvents = () => {
    window.addEventListener('click', this.onClickWindow, false);
  }

  unbindEvents = () => {
    window.removeEventListener('click', this.onClickWindow, false);
  }

  onChange = (color: Color) => {
    this.value = color.rgb;
  }

  render() {
    var visible = this.state.visible;
    var className = cssNames('ColorPicker', this.props.className, this.props.position);
    return (
      <div className={className} ref={e => this.elem = e}>
        <input type="color" disabled={this.props.disabled} hidden/>
        {visible && (
          <ChromePicker color={this.value} onChange={this.onChange}/>
        )}
        <i className="value"
           onClick={() => this.toggle()}
           style={{ color: cssColor(this.value) }}
           ref={e => this.handler = e}/>
      </div>
    );
  }
}
