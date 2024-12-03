import * as styles from "./color-picker.module.scss";
import React from "react"
import { ChromePicker, Color, ColorResult } from "react-color"
import { cssNames, IClassName, noop } from "../../utils";
import { toCssColor } from "../../utils/toCssColor";

export interface Props {
  className?: IClassName;
  disabled?: boolean
  defaultOpen?: boolean;
  position?: Position;
  value?: Color
  onChange?(color: Color): void;
}

export interface Position {
  left?: boolean;
  right?: boolean;
  top?: boolean;
  bottom?: boolean;
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
    if (target !== this.opener && !target.closest(`.${styles.ColorPicker}`)) {
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
    var { open: isOpen } = this.state;
    var { className, value, disabled, position } = this.props;
    var color = toCssColor(value);
    return (
      <div className={cssNames(styles.ColorPicker, className, {
        [styles.disabled]: disabled,
        [styles.top]: position?.top,
        [styles.left]: position?.left,
        [styles.right]: position?.right,
        [styles.bottom]: position?.bottom,
      })}>
        <input type="color" disabled={disabled} hidden/>
        {isOpen && (
          <ChromePicker
            className={styles.ChromePicker}
            color={value}
            onChange={this.onChange}
          />
        )}
        <span
          className={styles.value}
          style={{ color }}
          onClick={this.toggle}
          ref={e => this.opener = e}
        />
      </div>
    );
  }
}
