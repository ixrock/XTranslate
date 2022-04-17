import styles from "./dialog.module.scss";

import React from "react";
import { observer } from "mobx-react";
import { createPortal, findDOMNode } from "react-dom";
import { Animate } from "../animate";
import { cssNames, IClassName, noop, stopPropagation } from "../../utils";

export interface DialogProps {
  isOpen: boolean
  modal?: boolean
  pinned?: boolean
  className?: IClassName
  contentClassName?: IClassName
  onOpen?(): void
  onClose?(): void
}

@observer
export class Dialog extends React.Component<DialogProps> {
  public contentElem: HTMLElement;

  static defaultProps: DialogProps = {
    isOpen: false,
    onOpen: noop,
    onClose: noop,
    modal: true,
    pinned: false,
  };

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

  render() {
    var { modal, pinned, children, isOpen } = this.props;
    var className = cssNames(styles.Dialog, this.props.className, {
      [styles.modal]: modal,
      [styles.pinned]: pinned,
    });
    var contentClassName = cssNames(styles.box, this.props.contentClassName);

    var dialog = (
      <Animate name="opacity-scale" enter={isOpen} onEnter={this.open}>
        <div className={className} onClick={stopPropagation}>
          <div className={contentClassName} ref={e => this.contentElem = e}>
            {children}
          </div>
        </div>
      </Animate>
    );

    return createPortal(dialog, document.body);
  }
}