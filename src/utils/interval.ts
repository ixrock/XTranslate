// Helper for working with time updates / data-polling callbacks

export function interval(timeSec = 1) {
  var count, timer, running = false;
  return {
    run: function (callback: (count: number) => void) {
      this.stop();
      running = true;
      timer = setInterval(() => callback(++count), 1000 * timeSec);
    },
    stop: function () {
      count = 0;
      running = false;
      clearInterval(timer);
    },
    get isRunning() {
      return running;
    }
  }
}
