require('./menu.scss');

import * as React from 'react'
import { autobind } from "core-decorators";
import { Animate } from "../animate";
import { cssNames } from "../../../utils";
import omit = require('lodash/omit');

interface MenuProps extends React.HTMLProps<any> {
  theme?: "dark" | "light"
  htmlFor: string
  open?: boolean
  position?: string
  onOpen?: () => void
  onClose?: () => void
}

export class Menu extends React.Component<MenuProps, {}> {
  private opener: HTMLElement;
  private menu: HTMLElement;
  private animate: Animate;

  static defaultProps = {
    open: false,
    theme: "dark",
    position: "left bottom"
  };

  public state = {
    open: false
  };

  componentDidMount() {
    if (this.props.open) this.open();
    this.opener = document.getElementById(this.props.htmlFor);
    this.opener.addEventListener('click', this.toggle, false);
  }

  componentWillUnmount() {
    if (this.opener) {
      this.opener.removeEventListener('click', this.toggle, false);
    }
  }

  private setupPosition() {
    var parent = this.animate.elem.parentElement;
    var position = window.getComputedStyle(parent).position;
    if (position === 'static') parent.style.position = 'relative';
  }

  @autobind()
  private onMenuClick(evt) {
    var target = evt.target;
    var menuItem = target.closest('.' + MenuItem.CLASS_ITEM_NAME);
    if (menuItem && this.menu.contains(menuItem)) {
      if (!menuItem.classList.contains(MenuItem.CLASS_DISABLED)) {
        setTimeout(this.close);
      }
    }
  }

  @autobind()
  private onClickOutside(evt) {
    if (!this.menu) return;
    var target = evt.target;
    if (!this.menu.contains(target) && !this.opener.contains(target)) {
      this.close();
    }
  }

  @autobind()
  open() {
    if (this.state.open) return;
    if (this.props.onOpen) this.props.onOpen();
    this.setState({ open: true }, () => {
      this.setupPosition();
      this.menu.addEventListener('click', this.onMenuClick, false);
      window.addEventListener('click', this.onClickOutside, false);
    });
  }

  @autobind()
  close() {
    if (!this.state.open) return;
    if (this.props.onClose) this.props.onClose();
    this.menu.removeEventListener('click', this.onMenuClick, false);
    window.removeEventListener('click', this.onClickOutside, false);
    this.setState({ open: false });
  }

  @autobind()
  toggle() {
    if (!this.state.open) this.open();
    else this.close();
  }

  render() {
    var props = omit(this.props, ['position', 'open', 'theme', 'onOpen', 'onClose']);
    var containerClass = cssNames('Menu', this.props.className, {
      [this.props.position]: true
    });
    var menuClass = cssNames("menu-container", {
      ["theme-" + this.props.theme]: true,
    });
    return this.state.open ? (
        <Animate name={Animate.NAMES.DROP_DOWN}
                 className={containerClass} ref={e => this.animate = e}>
          <div {...props} className={menuClass} ref={e => this.menu = e}/>
        </Animate>
    ) : null;
  }
}

interface MenuItemProps extends React.HTMLProps<any> {
  hidden?: boolean
  disabled?: boolean
}

export class MenuItem extends React.Component<MenuItemProps, {}> {
  private item: HTMLElement;
  static CLASS_ITEM_NAME = 'MenuItem';
  static CLASS_DISABLED = 'disabled';

  render() {
    var props = omit(this.props, ['hidden', 'disabled']);
    var itemClass = cssNames(MenuItem.CLASS_ITEM_NAME, this.props.className, {
      disabled: this.props.disabled,
      hidden: this.props.hidden
    });
    return <div {...props} className={itemClass} ref={e => this.item = e}/>;
  }
}
