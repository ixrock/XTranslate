import './menu.scss'
import React, { Fragment, ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
import { autobind, cssNames, noop } from "../../utils";
import { Animate } from "../animate";
import { Icon, IconProps } from "../icon";

export const MenuContext = React.createContext<Menu>(null);

interface MenuPosition {
  left?: boolean;
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
}

export interface MenuProps {
  className?: string;
  htmlFor?: string;
  open?: boolean;
  autoFocus?: boolean;
  usePortal?: boolean | HTMLElement;
  closeOnClick?: boolean; // close menu on item click
  closeOnClickOutside?: boolean; // use false value for sub-menus
  closeOnScroll?: boolean; // applicable when usePortal={true}
  position?: MenuPosition; // applicable when usePortal={false}
  children?: ReactNode;
  onOpen?(): void;
  onClose?(): void;
}

interface MenuState {
  open: boolean;
  autoPosition?: MenuPosition;
}

@autobind()
export class Menu extends React.Component<MenuProps, MenuState> {
  static defaultProps: MenuProps = {
    position: { left: true, bottom: true },
    autoFocus: false,
    usePortal: false,
    closeOnClick: true,
    closeOnClickOutside: true,
    closeOnScroll: false,
    onOpen: noop,
    onClose: noop,
  };

  public opener: HTMLElement;
  public elem: HTMLUListElement;
  protected items: { [index: number]: MenuItem } = {};

  public state: MenuState = {
    open: this.props.open,
  };

  get isOpen() {
    return !!this.state.open;
  }

  componentDidMount() {
    if (!this.props.usePortal) {
      var parent = this.elem.parentElement;
      var position = window.getComputedStyle(parent).position;
      if (position === 'static') parent.style.position = 'relative';
    }
    else if (this.isOpen) {
      requestAnimationFrame(() => setTimeout(this.refreshPosition));
    }
    this.opener = document.getElementById(this.props.htmlFor); // might not exist in sub-menus
    if (this.opener) {
      this.opener.addEventListener('click', this.toggle);
      this.opener.addEventListener('keydown', this.onKeyDown);
    }
    this.elem.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('click', this.onClickOutside, true);
    window.addEventListener('scroll', this.onScrollOutside, true);
  }

  componentWillUnmount() {
    if (this.opener) {
      this.opener.removeEventListener('click', this.toggle);
      this.opener.removeEventListener('keydown', this.onKeyDown);
    }
    this.elem.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('click', this.onClickOutside, true);
    window.removeEventListener('scroll', this.onScrollOutside, true);
  }

  protected get focusableItems() {
    return Object.values(this.items).filter(item => item.isFocusable);
  }

  protected get focusedItem() {
    return this.focusableItems.find(item => item.elem === document.activeElement);
  }

  protected focusNextItem(reverse = false) {
    var items = this.focusableItems;
    var activeIndex = items.findIndex(item => item === this.focusedItem);
    if (!items.length) {
      return;
    }
    if (activeIndex > -1) {
      var nextItem = reverse ? items[activeIndex - 1] : items[activeIndex + 1];
      if (!nextItem) nextItem = items[activeIndex];
      nextItem.elem.focus();
    }
    else {
      items[0].elem.focus();
    }
  }

  refreshPosition() {
    if (!this.props.usePortal || !this.opener) return;
    var { left, top, bottom, right, width, height } = this.opener.getBoundingClientRect();
    var withScroll = window.getComputedStyle(this.elem).position !== "fixed";

    // window global scroll corrections
    if (withScroll) {
      left += window.pageXOffset;
      top += window.pageYOffset;
      right = left + width;
      bottom = top + height;
    }

    // setup initial position
    var position: MenuPosition = { left: true, bottom: true };
    this.elem.style.left = left + "px"
    this.elem.style.top = bottom + "px"

    // correct position if menu doesn't fit to viewport
    var menuPos = this.elem.getBoundingClientRect();
    if (menuPos.right > window.innerWidth) {
      this.elem.style.left = (right - this.elem.offsetWidth) + "px";
      position.right = true;
      delete position.left;
    }
    if (menuPos.bottom > window.innerHeight) {
      this.elem.style.top = (top - this.elem.offsetHeight) + "px";
      position.top = true;
      delete position.bottom;
    }
    this.setState({
      autoPosition: position
    });
  }

  setOpenerActiveState(active = true) {
    if (!this.opener) return;
    this.opener.classList.toggle("active", active);
  }

  open() {
    if (this.isOpen) return;
    this.setState({ open: true }, () => {
      this.refreshPosition();
      this.setOpenerActiveState();
      if (this.props.autoFocus) this.focusNextItem();
      this.props.onOpen();
    });
  }

  close() {
    if (!this.isOpen) return;
    this.setState({ open: false }, () => {
      this.setOpenerActiveState(false);
      this.props.onClose();
    });
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  onKeyDown(evt: KeyboardEvent) {
    if (!this.isOpen) return;
    switch (evt.code) {
      case "Escape":
        this.close();
        break;

      case "Space":
      case "Enter":
        var focusedItem = this.focusedItem;
        if (focusedItem) {
          focusedItem.elem.click();
          evt.preventDefault();
        }
        break;

      case "ArrowUp":
        this.focusNextItem(true);
        break;
      case "ArrowDown":
        this.focusNextItem();
        break;
    }
  }

  onWindowResize(evt: UIEvent) {
    if (!this.isOpen) return;
    this.refreshPosition();
  }

  onScrollOutside(evt: UIEvent) {
    if (!this.isOpen) return;
    var target = evt.target as HTMLElement;
    var { usePortal, closeOnScroll } = this.props;
    if (usePortal && closeOnScroll && !target.contains(this.elem)) {
      this.close();
    }
  }

  onClickOutside(evt: MouseEvent) {
    if (!this.props.closeOnClickOutside) return;
    if (!this.isOpen || evt.target === document.body) return;
    var target = evt.target as HTMLElement;
    var clickInsideMenu = this.elem.contains(target);
    var clickOnOpener = this.opener && this.opener.contains(target);
    if (!clickInsideMenu && !clickOnOpener) {
      this.close();
    }
  }

  protected bindRef(elem: HTMLUListElement) {
    this.elem = elem;
  }

  protected bindItemRef(item: MenuItem, index: number) {
    this.items[index] = item;
  }

  render() {
    var { className, usePortal, position } = this.props;
    var { autoPosition } = this.state;
    className = cssNames('Menu', className, autoPosition || position, {
      portal: usePortal,
    });

    var children = this.props.children as ReactElement<any>;
    if (children.type === Fragment) {
      children = children.props.children;
    }
    var menuItems = React.Children.toArray(children).map((item: ReactElement<MenuItemProps>, index) => {
      if (item.type === MenuItem) {
        return React.cloneElement(item, {
          ref: (item: MenuItem) => this.bindItemRef(item, index)
        });
      }
      return item;
    });

    var menu = (
      <MenuContext.Provider value={this}>
        <Animate enter={this.isOpen}>
          <ul className={className} ref={this.bindRef}>
            {menuItems}
          </ul>
        </Animate>
      </MenuContext.Provider>
    );
    if (usePortal === true) usePortal = document.body;
    return usePortal instanceof HTMLElement ? createPortal(menu, usePortal) : menu;
  }
}

export interface MenuItemProps extends React.HTMLProps<any> {
  icon?: string | Partial<IconProps>;
  disabled?: boolean
  active?: boolean
  spacer?: boolean;
  href?: string;
}

@autobind()
export class MenuItem extends React.Component<MenuItemProps> {
  static contextType = MenuContext;
  public context: Menu;
  public elem: HTMLElement;

  static defaultProps: Partial<MenuItemProps> = {
    onClick: noop,
  }

  get isFocusable() {
    var { disabled, spacer } = this.props;
    return !(disabled || spacer);
  }

  onClick(evt: React.MouseEvent) {
    var menu = this.context;
    var { spacer, onClick } = this.props;
    if (spacer) return;
    onClick(evt);
    if (menu && menu.props.closeOnClick) {
      menu.close();
    }
  }

  protected bindRef(elem: HTMLElement) {
    this.elem = elem;
  }

  render() {
    var { className, disabled, active, spacer, icon, children, ...props } = this.props;
    if (icon) {
      var iconProps: Partial<IconProps> = {};
      if (typeof icon === "string") iconProps.material = icon;
      else Object.assign(iconProps, icon);
    }
    var elemProps: React.HTMLProps<any> = {
      tabIndex: this.isFocusable ? 0 : -1,
      ...props,
      className: cssNames("MenuItem", className, { disabled, active, spacer }),
      onClick: this.onClick,
      children: icon ? <><Icon {...iconProps}/> {children}</> : children,
      ref: this.bindRef,
    }
    if (elemProps.href) {
      return <a {...elemProps}/>
    }
    if (elemProps.htmlFor) {
      return <label {...elemProps}/>
    }
    return <li {...elemProps}/>
  }
}