import "./dialog.scss";
import * as React from "react";
import { autobind } from "core-decorators";
import { cssNames, noop } from "../../../utils";
import { Portal } from "../../../utils/portal";

export interface DialogProps {
  className?: string | object
  open?: boolean
  modal?: boolean
  pinned?: boolean
  onClose?: () => any
  onOpen?: () => any
}

interface State {
  open?: boolean
}

export class Dialog extends React.Component<DialogProps, State> {
  private elem: HTMLElement;
  private contentElem: HTMLElement;

  public state: State = {
    open: this.props.open
  };

  static defaultProps: DialogProps = {
    open: false,
    modal: true,
    pinned: false,
    onClose: noop,
    onOpen: noop
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
      this.toggle(open);
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
    this.toggle(false);
  }

  toggle(isOpen?: boolean, callback?) {
    var open = arguments.length ? isOpen : !this.isOpen;
    if (!open) this.onClose();
    this.setState({ open }, () => {
      if (open) this.onOpen();
      if (callback) callback();
    });
  }

  protected onOpen() {
    if (this.props.onOpen) {
      this.props.onOpen();
    }
  }

  protected onClose() {
    if (this.props.onClose) {
      this.props.onClose();
    }
  }

  render(props = this.props) {
    var { className, open, modal, pinned, onClose, onOpen, children, ...dialogProps } = this.props;
    var dialogClass = cssNames("Dialog", 'flex center', className, {
      modal: modal == null || modal
    });
    if (!this.isOpen) {
      return null;
    }
    return (
      <Portal>
        <div {...dialogProps} className={dialogClass} ref={e => this.elem = e}>
          <div className="box" ref={e => this.contentElem = e}>
            {children}
          </div>
        </div>
      </Portal>
    );
  }
}