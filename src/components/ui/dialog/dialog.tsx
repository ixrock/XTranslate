import "./dialog.scss";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Animate } from "../animate";
import { cssNames, noop } from "../../../utils";
import omit = require("lodash/omit");

export interface DialogProps {
  isOpen?: boolean
  open?: () => void
  close?: () => void
  onOpen?: () => void
  onClose?: () => void
  className?: string
  modal?: boolean
  pinned?: boolean
  animated?: boolean
}

interface DialogState {
  isOpen: boolean
}

export class Dialog extends React.PureComponent<DialogProps, DialogState> {
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
    return ReactDOM.findDOMNode(this) as HTMLElement;
  }

  get isOpen() {
    return this.state.isOpen;
  }

  componentDidMount() {
    if (this.isOpen) this.onOpen();
  }

  componentWillReceiveProps(nextProps: DialogProps) {
    if (this.props.isOpen !== nextProps.isOpen) {
      nextProps.isOpen ? this.open() : this.close();
    }
  }

  componentWillUnmount() {
    if (this.isOpen) this.onClose();
  }

  open() {
    setTimeout(this.onOpen); // wait for render(), bind close-event to this.elem
    this.props.open();
    this.setState({ isOpen: true });
  }

  close() {
    this.onClose(); // must be first to get access to dialog's content from outside
    this.props.close();
    this.setState({ isOpen: false });
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
    var escapeKey = evt.keyCode === 27;
    if (escapeKey) this.close();
  }

  onClickOutside = (evt: MouseEvent) => {
    var target = evt.target as HTMLElement;
    if (!this.contentElem.contains(target)) {
      this.close();
    }
  }

  renderDialogWrapper(content = this.props.children) {
    var { className, isOpen, open, close, onOpen, onClose, modal, animated, pinned, ...dialogProps } = this.props;
    dialogProps = omit(dialogProps, "dispatch");
    var dialogClass = cssNames("Dialog flex center", { modal }, className);
    if (animated) {
      return (
        <Animate {...dialogProps} className={dialogClass} name="opacity-scale">
          {content}
        </Animate>
      )
    }
    return (
      <div {...dialogProps} className={dialogClass}>{content}</div>
    )
  }

  render() {
    if (!this.isOpen) return null;

    var dialog = this.renderDialogWrapper(
      <div className="box" ref={e => this.contentElem = e}>
        {this.props.children}
      </div>
    );
    return ReactDOM.createPortal(dialog, document.body);
  }
}