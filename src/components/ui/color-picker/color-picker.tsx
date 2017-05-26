require('./color-picker.scss');

import * as React from 'react'
import { autobind } from "core-decorators";
import { cssNames, noop } from "../../../utils";
import { cssColor, Color, ColorValue } from "./cssColor";
const ChromePicker = require('react-color/lib/components/chrome/Chrome').default;

interface Props {
  className?: any
  disabled?: boolean
  position?: "top left" | "top right" | "bottom left" | "bottom right"
  value?: ColorValue
  onChange?(color: ColorValue): void;
}

export class ColorPicker extends React.Component<Props, {}> {
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

  @autobind()
  private onClickWindow(e: MouseEvent) {
    var target = e.target as HTMLElement;
    if (target !== this.handler && !target.closest('.chrome-picker')) {
      this.toggle(false);
    }
  }

  @autobind()
  bindEvents() {
    window.addEventListener('click', this.onClickWindow, false);
  }

  @autobind()
  unbindEvents() {
    window.removeEventListener('click', this.onClickWindow, false);
  }

  toggle(visible = !this.state.visible) {
    this.setState({ visible }, this.bindEvents);
  }

  @autobind()
  onChange(color: Color) {
    this.value = color.rgb;
  }

  render() {
    var visible = this.state.visible;
    var className = cssNames('ColorPicker', this.props.className, this.props.position);
    return (
        <div className={className} ref={e => this.elem = e}>
          <input type="color" disabled={this.props.disabled} hidden/>
          {visible ? <ChromePicker color={this.value} onChange={this.onChange}/> : null}
          <i className="value"
             onClick={() => this.toggle()}
             style={{color: cssColor(this.value)}}
             ref={e => this.handler = e}/>
        </div>
    );
  }
}
