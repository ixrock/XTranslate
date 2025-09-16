// TODO: use native popover API
//  see: https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
import * as styles from './menu.module.scss'

import React, { Fragment, ReactElement, ReactNode, PropsWithChildren } from "react";
import { createPortal } from "react-dom";
import { observer } from "mobx-react";
import { action, makeObservable, observable } from "mobx";
import { autoBind, cssNames } from "@/utils";
import { Animate } from "../animate";
import { MenuContext } from './menu-context';
import { MenuItem, MenuItemProps } from './menu-item';
import debounce from "lodash/debounce";

export interface MenuPosition {
  left?: boolean;
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
}

export interface MenuProps {
  anchorId?: string;
  className?: string;
  isOpen?: boolean; // initial open-state
  position?: MenuPosition; // initial position
  autoFocus?: boolean;
  portalElem?: HTMLElement; // default: document.body
  closeOnItemClick?: boolean; // default: true
  closeOnClickOutside?: boolean; //  default: true
  closeOnScrollOutside?: boolean; // default: true
  children?: ReactNode;
  onOpen?(): void;
  onClose?(): void;
}

@observer
export class Menu extends React.Component<MenuProps> {
  static defaultProps: MenuProps = {
    autoFocus: false,
    closeOnItemClick: true,
    closeOnClickOutside: true,
    closeOnScrollOutside: true,
    portalElem: document.body,
  };

  public elem?: HTMLUListElement | undefined;
  protected items: { [index: number]: MenuItem } = {};

  @observable isOpen = this.props.isOpen ?? false;

  @observable position: MenuPosition = {
    left: true,
    top: true,
  };

  get anchorElem() {
    return document.getElementById(this.props.anchorId);
  }

  constructor(props: MenuProps) {
    super(props);
    makeObservable(this);
    autoBind(this);
  }

  @action
  componentDidUpdate() {
    this.isOpen = this.props.isOpen ?? this.isOpen
  }

  componentDidMount() {
    if (this.anchorElem) {
      this.anchorElem.addEventListener('click', this.toggle);
      this.anchorElem.addEventListener('keydown', this.onKeyDown);
    }
    window.addEventListener('resize', this.refreshPosition);
    window.addEventListener('click', this.onClickOutside);
    window.addEventListener('scroll', this.onScrollOutside);
  }

  componentWillUnmount() {
    if (this.anchorElem) {
      this.anchorElem.removeEventListener('click', this.toggle);
      this.anchorElem.removeEventListener('keydown', this.onKeyDown);
    }
    window.removeEventListener('resize', this.refreshPosition);
    window.removeEventListener('click', this.onClickOutside);
    window.removeEventListener('scroll', this.onScrollOutside);
  }

  @action
  open() {
    this.isOpen = true;
    if (this.props.autoFocus) this.focusNextItem();
    this.refreshPosition();
    this.props.onOpen?.();
    this.elem?.addEventListener('keydown', this.onKeyDown);
  }

  @action
  close() {
    this.elem?.removeEventListener('keydown', this.onKeyDown);
    this.isOpen = false;
    this.props.onClose?.();
  }

  @action
  toggle = debounce(() => {
    // FIXME: close is not working (e.g. import/export history)
    this.isOpen ? this.close() : this.open()
  });

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
    } else {
      items[0].elem.focus();
    }
  }

  refreshPosition = () => requestAnimationFrame(action(() => {
    if (!this.anchorElem || !this.elem) return;

    var { left, top, bottom, right, width, height } = this.anchorElem.getBoundingClientRect();
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

    this.position = position; // refresh
  }));

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
      evt.preventDefault(); // avoid document scrolling
      break;

    case "ArrowDown":
      this.focusNextItem();
      evt.preventDefault();
      break;
    }
  }

  onScrollOutside(evt: UIEvent) {
    if (!this.isOpen || !this.elem) return;
    if (this.props.closeOnScrollOutside) {
      this.close();
    }
  }

  onClickOutside(evt: MouseEvent) {
    if (!this.props.closeOnClickOutside || !this.isOpen) return;

    var isClickedInsideMenu = this.elem.contains(evt.target as HTMLElement);
    if (!isClickedInsideMenu) {
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
    var { left, top, bottom, right } = this.position;
    var className = cssNames(styles.Menu, this.props.className, {
      [styles.left]: left,
      [styles.right]: right,
      [styles.top]: top,
      [styles.bottom]: bottom,
    });

    var children = this.props.children as ReactElement;
    if (children.type === Fragment) {
      children = (children.props as PropsWithChildren).children as ReactElement;
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
        <Animate enter={this.isOpen} onEnter={this.open}>
          <ul className={className} ref={this.bindRef}>
            {menuItems}
          </ul>
        </Animate>
      </MenuContext.Provider>
    );

    return createPortal(menu, this.props.portalElem);
  }
}
