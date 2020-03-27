import './notifications.scss';

import React from 'react'
import { reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react"
import { cssNames, prevDefault } from "../../utils";
import { IMessage, INotification, notificationsStore } from "./notifications.store";
import { Animate } from "../animate";
import { Icon } from "../icon"

@observer
export class Notifications extends React.Component {
  public elem: HTMLElement;

  static ok(message: IMessage) {
    notificationsStore.add({
      message: message,
      timeout: 2500,
      status: "ok"
    })
  }

  static error(message: IMessage) {
    notificationsStore.add({
      message: message,
      timeout: 5000,
      status: "error"
    });
  }

  static info(message: IMessage) {
    return notificationsStore.add({
      message: message,
      timeout: 0,
      status: "info"
    });
  }

  componentDidMount() {
    disposeOnUnmount(this, [
      reaction(() => notificationsStore.notifications.length, () => {
        this.scrollToLastNotification();
      }, { delay: 250 }),
    ]);
  }

  scrollToLastNotification() {
    if (!this.elem) {
      return;
    }
    this.elem.scrollTo({
      top: this.elem.scrollHeight,
      behavior: "smooth"
    })
  }

  getMessage({ message }: INotification) {
    return React.Children.toArray(message);
  }

  render() {
    var { notifications, remove, addAutoHideTimer, removeAutoHideTimer } = notificationsStore;
    return (
      <div className="Notifications flex column align-flex-end" ref={e => this.elem = e}>
        {notifications.map(notification => {
          var { id, status } = notification;
          var msgText = this.getMessage(notification);
          return (
            <Animate key={id}>
              <div
                className={cssNames("notification flex align-center", status)}
                onMouseLeave={() => addAutoHideTimer(notification)}
                onMouseEnter={() => removeAutoHideTimer(notification)}>
                <div className="box center">
                  <Icon material="info_outline"/>
                </div>
                <div className="message box grow">{msgText}</div>
                <div className="box center">
                  <Icon
                    className="close-icon"
                    material="close"
                    onClick={prevDefault(() => remove(notification))}
                  />
                </div>
              </div>
            </Animate>
          )
        })}
      </div>
    )
  }
}
