import * as styles from './notifications.module.scss';
import React from 'react'
import { reaction } from "mobx";
import { observer } from "mobx-react"
import { cssNames, disposer, prevDefault } from "../../utils";
import { IMessage, INotification, notificationsStore } from "./notifications.store";
import { Animate } from "../animate";
import { Icon } from "../icon"

@observer
export class Notifications extends React.Component {
  private dispose = disposer();
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

  constructor(props: object) {
    super(props);

    this.dispose.push(
      reaction(() => notificationsStore.notifications.length, this.scrollToLastNotification, {
        delay: 250,
      }),
    );
  }

  componentWillUnmount() {
    this.dispose();
  }

  scrollToLastNotification = () => {
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
      <div className={styles.Notifications} ref={e => this.elem = e}>
        {notifications.map(notification => {
          var { id, status } = notification;
          var msgText = this.getMessage(notification);
          var removeNotification = prevDefault(() => remove(notification));
          return (
            <Animate key={id}>
              <div
                className={cssNames(styles.notification, status)}
                onMouseLeave={() => addAutoHideTimer(notification)}
                onMouseEnter={() => removeAutoHideTimer(notification)}
              >
                <Icon
                  className={styles.infoIcon}
                  material="info_outline"
                />
                <div className={styles.message}>
                  {msgText}
                </div>
                <Icon
                  className={styles.closeIcon}
                  material="close"
                  onClick={removeNotification}
                />
              </div>
            </Animate>
          )
        })}
      </div>
    )
  }
}
