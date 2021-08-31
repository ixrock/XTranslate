import "./color-picker.scss";

import * as React from 'react'
import { ChromePicker, Color, ColorResult } from "react-color"
import { cssNames, noop, toCssColor } from "../../utils";

interface Props {
  className?: string
  disabled?: boolean
  defaultOpen?: boolean;
  position?: { left?: boolean, right?: boolean, top?: boolean, bottom?: boolean }
  value?: Color
  onChange?(color: Color): void;
}

interface State {
  open?: boolean;
}

export class ColorPicker extends React.Component<Props, State> {
  private opener: HTMLElement;

  static defaultProps: Props = {
    position: { bottom: true, left: true },
    value: "#fff",
    onChange: noop,
  };

  public state: State = {
    open: !!this.props.defaultOpen,
  };

  componentDidMount() {
    window.addEventListener('click', this.onClickOutside);
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.onClickOutside);
  }

  onClickOutside = (evt: MouseEvent) => {
    if (!this.state.open) {
      return;
    }
    var target = evt.target as HTMLElement;
    if (target !== this.opener && !target.closest('.chrome-picker')) {
      this.hide();
    }
  }

  onChange = (color: ColorResult) => {
    if (this.props.onChange) {
      this.props.onChange(color.rgb);
    }
  }

  show() {
    this.setState({ open: true });
  }

  hide() {
    this.setState({ open: false })
  }

  toggle = () => {
    if (this.state.open) this.hide();
    else this.show();
  }

  render() {
    var { open } = this.state;
    var { className, value, disabled, position } = this.props;
    var color = toCssColor(value);
    return (
      <div className={cssNames("ColorPicker", className, position, { disabled })}>
        <input type="color" disabled={disabled} hidden/>
        {open && (
          <ChromePicker color={value} onChange={this.onChange}/>
        )}
        <span
          className="value"
          style={{ color }}
          onClick={this.toggle}
          ref={e => this.opener = e}
        />
      </div>
    );
  }
}
