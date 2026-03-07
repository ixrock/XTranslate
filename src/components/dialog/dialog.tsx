import * as styles from "./dialog.module.scss";

import React from "react";
import { createPortal } from "react-dom";
import { cssNames, IClassName, noop } from "@/utils";
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

  public elem?: HTMLDialogElement;
  public contentElem?: HTMLDivElement;
  private openedAsModal = false;
  private notifyOnNativeClose = true;

  componentDidMount() {
    this.syncOpenState();
  }

  componentDidUpdate(prevProps: DialogProps) {
    const openChanged = prevProps.isOpen !== this.props.isOpen;
    const modalChanged = prevProps.modal !== this.props.modal;
    const syncRequired = openChanged || modalChanged;
    if (syncRequired) {
      this.syncOpenState();
    }
  }

  componentWillUnmount() {
    this.requestClose({ notify: false });
  }

  private showDialog = () => {
    if (!this.elem || this.elem.open) {
      return;
    }

    if (this.props.modal) {
      this.elem.showModal();
      this.openedAsModal = true;
    } else {
      this.elem.show();
      this.openedAsModal = false;
    }

    this.props.onOpen();
  };

  open = () => {
    this.showDialog();
  };

  private requestClose = ({ notify }: { notify: boolean }) => {
    if (!this.elem || !this.elem.open) {
      if (notify) {
        this.props.onClose();
      }
      return;
    }

    this.notifyOnNativeClose = notify;
    this.elem.close();
  };

  close = () => {
    this.requestClose({ notify: true });
  };

  private syncOpenState = () => {
    if (!this.elem) {
      return;
    }

    if (!this.props.isOpen) {
      this.requestClose({ notify: false });
      return;
    }

    const shouldOpenAsModal = Boolean(this.props.modal);
    const modeChanged = this.elem.open && this.openedAsModal !== shouldOpenAsModal;
    if (modeChanged) {
      this.requestClose({ notify: false });
    }
    if (!this.elem.open) {
      this.showDialog();
    }
  };

  private onCancel = (evt: React.SyntheticEvent<HTMLDialogElement, Event>) => {
    if (this.props.pinned) {
      evt.preventDefault();
    }
  };

  private onNativeClose = () => {
    this.openedAsModal = false;
    const shouldNotify = this.notifyOnNativeClose;
    this.notifyOnNativeClose = true;
    if (shouldNotify) {
      this.props.onClose();
    }
  };

  private onDialogClick = (evt: React.MouseEvent<HTMLDialogElement>) => {
    if (this.props.pinned || evt.target !== this.elem) {
      return;
    }
    this.close();
  };

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

  private bindElemRef = (elem: HTMLDialogElement) => {
    this.elem = elem;
  };
  private bindContentElemRef = (elem: HTMLDivElement) => {
    this.contentElem = elem;
  };

  render() {
    const { modal, pinned, children } = this.props;
    const className = cssNames(styles.Dialog, this.props.className, {
      [styles.modal]: modal,
      [styles.pinned]: pinned,
    });
    const contentClassName = cssNames(styles.box, this.props.contentClassName);

    const dialog = (
      <dialog
        className={className}
        ref={this.bindElemRef}
        onCancel={this.onCancel}
        onClose={this.onNativeClose}
        onClick={this.onDialogClick}
      >
        <div className={contentClassName} ref={this.bindContentElemRef}>
          {this.renderCloseIcon()}
          {children}
        </div>
      </dialog>
    );

    return createPortal(dialog, document.body);
  }
}