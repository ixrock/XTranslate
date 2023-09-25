import styles from "./dialog.module.scss";

import React from "react";
import { observer } from "mobx-react";
import { createPortal, findDOMNode } from "react-dom";
import { Animate } from "../animate";
import { cssNames, IClassName, noop, stopPropagation } from "../../utils";
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

@observer
export class Dialog extends React.Component<DialogProps> {
  static defaultProps = defaultProps as unknown as DialogProps;

  public contentElem: HTMLElement;

  get elem() {
    return findDOMNode(this) as HTMLElement;
  }

  open = () => {
    this.props.onOpen();

    if (!this.props.pinned) {
      if (this.elem) this.elem.addEventListener('click', this.onClickOutside);
      window.addEventListener('keydown', this.onEscapeKey);
    }
  }

  close = () => {
    this.props.onClose();

    if (!this.props.pinned) {
      if (this.elem) this.elem.removeEventListener('click', this.onClickOutside);
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
    if (!this.props.showCloseIcon) {
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

  render() {
    var { modal, pinned, children, isOpen, showCloseIcon } = this.props;
    var className = cssNames(styles.Dialog, this.props.className, {
      [styles.modal]: modal,
      [styles.pinned]: pinned,
    });
    var contentClassName = cssNames(styles.box, this.props.contentClassName);

    var dialog = (
      <Animate name="opacity-scale" enter={isOpen} onEnter={this.open}>
        <div className={className} onClick={stopPropagation}>
          <div className={contentClassName} ref={e => this.contentElem = e}>
            {this.renderCloseIcon()}
            {children}
          </div>
        </div>
      </Animate>
    );

    return createPortal(dialog, document.body);
  }
}