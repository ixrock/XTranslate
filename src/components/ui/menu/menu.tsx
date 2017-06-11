import "./menu.scss";

import * as React from "react";
import { autobind } from "core-decorators";
import { Animate } from "../../ui";
import { cssNames, noop } from "../../../utils";

type MenuPos = "left" | "right" | "top" | "bottom"

interface MenuProps extends React.HTMLProps<any> {
  htmlFor: string
  open?: boolean
  position?: MenuPos | MenuPos[]
  onOpen?: () => void
  onClose?: () => void
}

interface MenuState {
  open?: boolean
}

export class Menu extends React.Component<MenuProps, MenuState> {
  private opener: HTMLElement;
  private menu: HTMLElement;
  private animate: Animate;
  public state: MenuState = {};

  static defaultProps: Partial<MenuProps> = {
    open: false,
    position: ["left", "bottom"],
    onOpen: noop,
    onClose: noop,
  };


  get isOpen() {
    return this.state.open;
  }

  componentDidMount() {
    if (this.props.open) this.open();
    this.opener = document.getElementById(this.props.htmlFor);
    if (this.opener) this.opener.addEventListener('click', this.toggle);
    window.addEventListener('click', this.onClickOutside);
  }

  componentWillReceiveProps(nextProps: MenuProps) {
    var { open } = this.props;
    if (open !== nextProps.open) {
      nextProps.open ? this.open() : this.close();
    }
  }

  componentWillUnmount() {
    if (this.opener) this.opener.removeEventListener('click', this.toggle);
    window.removeEventListener('click', this.onClickOutside);
  }

  private setupPosition() {
    var parent = this.animate.elem.parentElement;
    var position = window.getComputedStyle(parent).position;
    if (position === 'static') parent.style.position = 'relative';
  }

  @autobind()
  private onClickOutside(evt: MouseEvent) {
    if (!this.isOpen) return;
    var target = evt.target as HTMLElement;
    if (!this.menu.contains(target) && !this.opener.contains(target)) {
      this.close();
    }
  }

  @autobind()
  open() {
    if (this.isOpen) return;
    this.setState({ open: true }, () => {
      this.props.onOpen();
      this.setupPosition();
    });
  }

  @autobind()
  close() {
    if (!this.isOpen) return;
    this.props.onClose();
    this.setState({ open: false });
  }

  @autobind()
  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  @autobind()
  bindAnimate(animate: Animate) {
    if (!animate) return;
    this.animate = animate;
    this.menu = animate.elem;
  }

  render() {
    if (!this.isOpen) return null;
    var { className, position, open, onOpen, onClose, children, ...menuProps } = this.props;
    className = cssNames('Menu', position, className);
    return (
      <Animate {...menuProps} className={className} ref={this.bindAnimate}>
        {React.Children.toArray(children).map((elem: React.ReactElement<MenuItemProps>) => {
          return React.cloneElement(elem, { parentMenu: this } as MenuItemProps)
        })}
      </Animate>
    );
  }
}

interface MenuItemProps extends React.HTMLProps<any> {
  parentMenu?: Menu
  disabled?: boolean
  spacer?: boolean
}

export class MenuItem extends React.Component<MenuItemProps, {}> {
  private elem: HTMLElement;

  @autobind()
  onClick(evt: React.MouseEvent<HTMLElement>) {
    var { parentMenu, onClick } = this.props;
    onClick && onClick(evt);
    parentMenu.close();
  }

  render() {
    var { className, disabled, spacer, parentMenu, ...props } = this.props;
    return (
      <div {...props}
           className={cssNames('MenuItem', { disabled, spacer }, className)}
           onClick={this.onClick} ref={e => this.elem = e}
      />
    );
  }
}
