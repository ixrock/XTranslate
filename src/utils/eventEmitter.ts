// Helper for subscribing to custom class events
import isString from "lodash/isString"
import isFunction from "lodash/isFunction"

interface Subscriber<D extends Event = Event> {
  eventType: string
  callback: EventListener<D>
  options?: EventOptions
}

interface Event {
  type: string;
  [data: string]: any;
}

interface EventListener<D extends Event = Event> {
  (this: EventEmitter<D>, evt: D): void;
}

interface EventOptions {
  once?: boolean
}

export class EventEmitter<D extends Event = Event> {
  private subscribers: Subscriber<D>[] = [];

  private parseEventTypes(type: string): string[] {
    return type.trim().split(/\s+/);
  }

  addListener(eventType: string | EventListener<D>, callback?: EventListener<D> | EventOptions, options?: EventOptions): this {
    var subscriber = {
      eventType: isString(eventType) ? eventType : "*",
      callback: isFunction(eventType) ? eventType : callback as EventListener<D>,
      options: (isFunction(eventType) ? callback as EventOptions : options) || {},
    };
    {
      let { eventType, options, callback } = subscriber;
      if (options.once) {
        var originalCallback = callback;
        callback = (event: D) => {
          originalCallback.call(this, event);
          this.removeListener(event.type, callback);
        };
      }
      this.parseEventTypes(eventType).forEach(eventType => {
        this.subscribers.push({ eventType, callback, options });
      });
    }
    return this;
  }

  removeListener(eventType?: string | EventListener, callback?: EventListener): this {
    if (!arguments.length) {
      this.subscribers = [];
    }
    else {
      // remove subscriptions with specific event types and optional callback
      if (typeof eventType === "string") {
        var eventTypes = this.parseEventTypes(eventType);
        this.subscribers = this.subscribers
          .filter(subscriber => {
            var byType = eventTypes.includes(subscriber.eventType);
            var byCallback = callback === subscriber.callback;
            if (callback) return !(byType && byCallback);
            return !byType;
          });
      }
      // remove all subscriptions with specific callback
      else {
        this.subscribers = this.subscribers
          .filter(subscriber => subscriber.callback !== callback)
      }
    }
    return this;
  }

  dispatch(eventType: string | D, data?: D): this {
    data = isString(eventType) ? data : eventType;
    eventType = isString(eventType) ? eventType : "*";

    this.subscribers.forEach(subscriber => {
      if (subscriber.eventType !== eventType) return;
      subscriber.callback.call(this, data);
    });
    return this;
  }
}
