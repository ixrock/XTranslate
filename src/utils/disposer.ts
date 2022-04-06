// Keeps stack of callbacks for later clean up (e.g. remove event handlers)

export interface Disposer {
  (...disposers: Disposer[]): void;
  push(...disposers: Disposer[]): void;
}

export function disposer(...args: Disposer[]): Disposer {
  const disposers = [...args];

  function dispose() {
    disposers.forEach(dispose => dispose?.());
    disposers.length = 0;
  }

  dispose.push = (...args: Disposer[]) => {
    return disposers.push(...args);
  }

  return dispose;
}
