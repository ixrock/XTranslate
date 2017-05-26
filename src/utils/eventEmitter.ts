// Helper class for using publish/subscribe pattern

interface Event {
  type: string
  callback: EventHandler
  options: EventOptions
}

interface EventOptions {
  once?: boolean
}

interface EventHandler {
  (this: EventEmitter, ...data): any;
}

export class EventEmitter {
  private events: Event[] = [];

  on(eventType: string, callback: EventHandler, options: EventOptions = {}): this {
    if (options.once) {
      var originalCallback = callback;
      callback = (...data) => {
        originalCallback.apply(this, data);
        this.off(eventType, callback);
      };
    }
    this.events.push({
      type: eventType,
      callback: callback,
      options: options
    });
    return this;
  }

  off(eventType?: string, callback?: EventHandler): this {
    if (!eventType) this.events = [];
    else {
      this.events = this.events.filter(event => {
        var byType = eventType === event.type;
        if (callback) return !(byType && callback === event.callback);
        return !byType;
      });
    }
    return this;
  }

  protected emit(eventType: string, ...data): this {
    this.events.forEach(event => {
      if (event.type !== eventType) return;
      event.callback.apply(this, data);
    });
    return this;
  }
}
