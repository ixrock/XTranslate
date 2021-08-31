import * as React from "react";
import { action, observable } from "mobx"
import { autoBind } from "../../utils";
import isObject from "lodash/isObject"
import uniqueId from "lodash/uniqueId";

export type IMessageId = string | number;
export type IMessage = React.ReactNode;

export interface INotification {
  id?: IMessageId
  message: IMessage
  status?: "ok" | "error" | "info"
  timeout?: number // auto-hiding timeout in milliseconds, 0 = no hide
}

export class NotificationsStore {
  public notifications = observable.array<INotification>([], { deep: false });
  protected autoHideTimers = new Map<IMessageId, number>();

  constructor() {
    autoBind(this);
  }

  addAutoHideTimer(notification: INotification) {
    this.removeAutoHideTimer(notification);
    var { id, timeout } = notification;
    if (timeout) {
      var timer = window.setTimeout(() => this.remove(id), timeout);
      this.autoHideTimers.set(id, timer);
    }
  }

  removeAutoHideTimer(notification: INotification) {
    var { id } = notification;
    if (this.autoHideTimers.has(id)) {
      clearTimeout(this.autoHideTimers.get(id));
      this.autoHideTimers.delete(id);
    }
  }

  @action
  add(notification: INotification) {
    if (!notification.id) {
      notification.id = uniqueId("notification_");
    }
    var index = this.notifications.findIndex(item => item.id === notification.id);
    if (index > -1) this.notifications.splice(index, 1, notification)
    else this.notifications.push(notification);
    this.addAutoHideTimer(notification);
  }

  @action
  remove(itemOrId: IMessageId | INotification) {
    if (!isObject(itemOrId)) {
      itemOrId = this.notifications.find(item => item.id === itemOrId);
    }
    return this.notifications.remove(itemOrId as INotification);
  }
}

export const notificationsStore = new NotificationsStore();
