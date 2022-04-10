import styles from "./dialog.module.scss";
import * as React from "react";
import { createPortal, findDOMNode } from "react-dom";
import { Animate } from "../animate";
import { cssNames, IClassName, noop, stopPropagation } from "../../utils";

export interface DialogProps {
  className?: IClassName;
  contentClassName?: string
  isOpen?: boolean
  open?: () => void
  close?: () => void
  onOpen?: () => void
  onClose?: () => void
  modal?: boolean
  pinned?: boolean
  animated?: boolean
}

interface DialogState {
  isOpen: boolean
}

export class Dialog extends React.Component<DialogProps, DialogState> {
  private contentElem: HTMLElement;

  static defaultProps: DialogProps = {
    isOpen: false,
    open: noop,
    close: noop,
    onOpen: noop,
    onClose: noop,
    modal: true,
    animated: true,
    pinned: false,
  };

  public state: DialogState = {
    isOpen: this.props.isOpen,
  }

  get elem() {
    return findDOMNode(this) as HTMLElement;
  }

  get isOpen() {
    return this.state.isOpen;
  }

  componentDidMount() {
    if (this.isOpen) this.onOpen();
  }

  componentDidUpdate(prevProps: DialogProps) {
    var { isOpen } = this.props;
    if (isOpen !== prevProps.isOpen) {
      isOpen ? this.open() : this.close();
    }
  }

  componentWillUnmount() {
    if (this.isOpen) this.onClose();
  }

  open() {
    setTimeout(this.onOpen); // wait for render(), bind close-event to this.elem
    this.setState({ isOpen: true });
    this.props.open();
  }

  close() {
    this.onClose(); // must be first to get access to dialog's content from outside
    this.setState({ isOpen: false });
    this.props.close();
  }

  onOpen = () => {
    this.props.onOpen();
    if (!this.props.pinned) {
      if (this.elem) this.elem.addEventListener('click', this.onClickOutside);
      window.addEventListener('keydown', this.onEscapeKey);
    }
  }

  onClose = () => {
    this.props.onClose();
    if (!this.props.pinned) {
      if (this.elem) this.elem.removeEventListener('click', this.onClickOutside);
      window.removeEventListener('keydown', this.onEscapeKey);
    }
  }

  onEscapeKey = (evt: KeyboardEvent) => {
    var escapeKey = evt.code === "Escape";
    if (escapeKey) {
      this.close();
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
    if (!this.isOpen) return;

    var { className, modal, animated, pinned, contentClassName } = this.props;
    className = cssNames(`${styles.Dialog} flex center`, className, {
      [styles.modal]: modal,
      [styles.pinned]: pinned,
    });
    contentClassName = cssNames(`${styles.box} box`, contentClassName);

    var dialog = (
      <div className={className} onClick={stopPropagation}>
        <div className={contentClassName} ref={e => this.contentElem = e}>
          {this.props.children}
        </div>
      </div>
    );

    if (animated) {
      dialog = <Animate name="opacity-scale">{dialog}</Animate>;
    }

    return createPortal(dialog, document.body);
  }
}