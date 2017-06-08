import "./dialog.scss";
import * as React from "react";
import { autobind } from "core-decorators";
import { cssNames, noop } from "../../../utils";
import { Animate } from "../animate";
import { Portal } from "../../../utils/portal";

export interface DialogProps {
  className?: string | object
  open?: boolean
  modal?: boolean
  pinned?: boolean
  animated?: boolean
  onClose?: () => any
  onOpen?: () => any
}

interface DialogState {
  open?: boolean
}

export class Dialog extends React.Component<DialogProps, DialogState> {
  private animate: Animate;
  private elem: HTMLElement;
  private contentElem: HTMLElement;

  static defaultProps: DialogProps = {
    modal: true,
    animated: true,
    pinned: false,
    onOpen: noop,
    onClose: noop,
  };

  public state: DialogState = {
    open: this.props.open
  };

  get isOpen() {
    return this.state.open;
  }

  private events = {
    closeOnEscape: e => {
      var target: HTMLElement = e.target;
      var escapeKey = e.keyCode === 27;
      var focusedInnerItem = this.contentElem.contains(target) && target.matches(':focus');
      if (escapeKey && !focusedInnerItem) this.close();
    },
    closeOnClickOutside: e => {
      var target: HTMLElement = e.target;
      if (!this.contentElem.contains(target)) {
        this.close();
      }
    }
  };

  private bindEvents() {
    if (this.props.pinned) return;
    window.addEventListener('keydown', this.events.closeOnEscape);
    this.elem.addEventListener('click', this.events.closeOnClickOutside);
  }

  private unbindEvents() {
    if (this.props.pinned) return;
    window.removeEventListener('keydown', this.events.closeOnEscape);
    this.elem.removeEventListener('click', this.events.closeOnClickOutside);
  }

  componentWillReceiveProps({ open }: DialogProps) {
    if (this.state.open !== open) {
      if (open) this.open();
      else this.close();
    }
  }

  componentDidMount() {
    if (this.props.open) {
      this.open();
    }
  }

  componentWillUnmount() {
    if (this.isOpen) this.unbindEvents();
  }

  @autobind()
  open() {
    if (this.isOpen) return;
    this.toggle(true, () => this.bindEvents());
  }

  @autobind()
  close() {
    if (!this.isOpen) return;
    this.unbindEvents();
    if (this.animate) this.animate.leave();
    else this.toggle(false);
  }

  toggle(isOpen?: boolean, callback?) {
    var open = arguments.length ? isOpen : !this.isOpen;
    if (!open) this.props.onClose();
    this.setState({ open }, () => {
      if (open) this.props.onOpen();
      if (callback) callback();
    });
  }

  @autobind()
  bindAnimate(animate: Animate) {
    if (!animate) return;
    this.animate = animate;
    this.elem = animate.elem;
  }

  render() {
    var { className, open, modal, animated, onClose, onOpen, children, ...dialogProps } = this.props;
    if (!this.isOpen) return null;

    var dialogClass = cssNames("Dialog", 'flex center', { modal }, className);
    var content = (
      <div className="box" ref={e => this.contentElem = e}>
        {children}
      </div>
    );
    if (animated) {
      var dialog = (
        <Animate
          {...dialogProps} className={dialogClass}
          name="opacity-scale" leaveCallback={() => this.toggle(false)}
          ref={this.bindAnimate}>
          {content}
        </Animate>
      )
    }
    else {
      var dialog = (
        <div {...dialogProps} className={dialogClass} ref={e => this.elem = e}>
          {content}
        </div>
      )
    }
    return <Portal>{dialog}</Portal>;
  }
}