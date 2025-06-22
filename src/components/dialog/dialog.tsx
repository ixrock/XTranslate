import * as styles from "./dialog.module.scss";

import React from "react";
import { createPortal } from "react-dom";
import { Animate } from "../animate";
import { cssNames, IClassName, noop, stopPropagation } from "@/utils";
import { Icon } from "../icon";

export interface DialogProps extends React.PropsWithChildren {
  isOpen: boolean
  modal?: boolean
  pinned?: boolean
  className?: IClassName
  contentClassName?: IClassName
  showCloseIcon?: boolean;
  onOpen?(): void
  onClose?(): void
}

const defaultProps: Partial<DialogProps> = {
  isOpen: false,
  onOpen: noop,
  onClose: noop,
  modal: true,
  pinned: false,
  showCloseIcon: true,
};

export class Dialog extends React.Component<DialogProps> {
  static defaultProps = defaultProps as unknown as DialogProps;

  public elem?: HTMLElement;
  public contentElem?: HTMLElement;

  open = () => {
    this.props.onOpen();

    if (!this.props.pinned) {
      this.elem.addEventListener('click', this.onClickOutside);
      window.addEventListener('keydown', this.onEscapeKey);
    }
  }

  close = () => {
    this.props.onClose();

    if (!this.props.pinned) {
      this.elem.removeEventListener('click', this.onClickOutside);
      window.removeEventListener('keydown', this.onEscapeKey);
    }
  }

  onEscapeKey = (evt: KeyboardEvent) => {
    var escapeKey = evt.code === "Escape";
    if (escapeKey) {
      this.props.onClose();
      evt.stopPropagation();
    }
  }

  onClickOutside = (evt: MouseEvent) => {
    var target = evt.target as HTMLElement;
    if (!this.contentElem.contains(target)) {
      this.close();
      evt.stopPropagation();
    }
  }

  renderCloseIcon(): React.ReactNode {
    if (!this.props.showCloseIcon || this.props.pinned) {
      return;
    }
    return (
      <Icon
        material="close"
        className={styles.closeIcon}
        onClick={this.close}
      />
    );
  }

  private bindElemRef = (elem: HTMLElement) => {
    this.elem = elem;
  };
  private bindContentElemRef = (elem: HTMLElement) => {
    this.contentElem = elem;
  };

  render() {
    var { modal, pinned, children, isOpen } = this.props;
    var className = cssNames(styles.Dialog, this.props.className, {
      [styles.modal]: modal,
      [styles.pinned]: pinned,
    });
    var contentClassName = cssNames(styles.box, this.props.contentClassName);

    var dialog = (
      <Animate name="opacity-scale" enter={isOpen} onEnter={this.open}>
        <div className={className} onClick={stopPropagation} ref={this.bindElemRef}>
          <div className={contentClassName} ref={this.bindContentElemRef}>
            {this.renderCloseIcon()}
            {children}
          </div>
        </div>
      </Animate>
    );

    return createPortal(dialog, document.body);
  }
}