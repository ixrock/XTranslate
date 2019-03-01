// Event emitter

interface Options {
  once?: boolean;
  prepend?: boolean;
}

interface Callback<D = any> {
  (...data: D[]): void | boolean; // if listener return false it will prevent calling rest of callbacks
  once?: boolean; // remove listener after first call
}

export class EventEmitter<D = any> {
  private events: { [evtName: string]: Callback<D>[] } = {};

  private parseEvents(events: string) {
    return events.split(/\s+/);
  }

  addListener(events: string, callback: Callback<D>, options: Options = {}) {
    this.parseEvents(events).forEach(evtName => {
      var listeners = this.events[evtName] || [];
      var { once, prepend } = options;
      if (once) callback.once = once;
      if (prepend) listeners.unshift(callback);
      else listeners.push(callback);
      this.events[evtName] = listeners;
    });
  }

  removeListeners(events?: string, callback?: Callback<D>) {
    if (!events) this.events = {};
    else {
      this.parseEvents(events).forEach(evtName => {
        var listeners = this.events[evtName];
        if (!listeners) return;
        if (callback) {
          var index = listeners.lastIndexOf(callback);
          if (index > -1) listeners.splice(index, 1);
        }
        else {
          this.events[evtName].length = 0;
        }
      });
    }
  }

  emit(events: string, ...data: D[]) {
    this.parseEvents(events).forEach(evtName => {
      var listeners = this.events[evtName];
      if (!listeners) return;
      for (let callback of listeners) {
        var result = callback(...data);
        if (result === false) break; // prevent calling rest of listeners for that event
        if (callback.once) this.removeListeners(evtName, callback);
      }
    });
  }
}
