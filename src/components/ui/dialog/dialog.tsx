require('./dialog.scss');
import * as React from 'react'
import { Portal } from "../../../utils/portal";
import { cssNames, noop } from "../../../utils";
import omit = require('lodash/omit');

export interface Props extends React.HTMLProps<any> {
  open?: boolean
  modal?: boolean
  pinned?: boolean
  onClose?: () => any
  onOpen?: () => any
}

export class Dialog extends React.Component<Props, {}> {
  private elem: HTMLElement;
  private contentElem: HTMLElement;

  public state = {
    open: this.props.open
  };

  static defaultProps: Props = {
    open: false,
    modal: true,
    pinned: false,
    onClose: noop,
    onOpen: noop
  };

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

  componentDidMount() {
    if (this.props.open) {
      this.props.onOpen();
      this.bindEvents();
    }
  }

  componentWillUnmount() {
    if (this.state.open) this.unbindEvents();
  }

  open() {
    if (this.state.open) return;
    this.toggle(true, () => this.bindEvents());
  }

  close() {
    if (!this.state.open) return;
    this.unbindEvents();
    this.toggle(false);
  }

  toggle(isOpen?: boolean, callback?) {
    var open = arguments.length ? isOpen : !this.state.open;
    if (open) this.props.onOpen();
    else this.props.onClose();
    this.setState({ open }, callback);
  }

  render() {
    var modal = this.props.modal;
    var props = omit(this.props, ['className', 'open', 'modal', 'pinned', 'onClose', 'onOpen']);
    var componentClass = cssNames("Dialog", 'flex center', this.props.className, {
      modal: modal
    });
    return this.state.open ? (
        <Portal>
          <div className={componentClass} {...props} ref={e => this.elem = e}>
            <div className="box" ref={e => this.contentElem = e}>
              {this.props.children}
            </div>
          </div>
        </Portal>
    ) : null;
  }
}

export default Dialog;