import { useEffect } from "react";
import throttle from "lodash/throttle";

export interface DOMWatcherOpts {
  elem: HTMLElement; // element for watching
  onChange: (evt: ElementWatcherEventData) => void;
  debounceMs?: number; // reduce calling "callback" to min that amount (default: 0)
}

/**
 * React-hook for watching DOM-element dimensions, position & scrollbar
 * @param {HTMLElement} elem
 * @param {Function} onChange
 * @param {number} debounceMs
 */
export function useDOMWatcher({ elem, onChange, debounceMs = 0 }: DOMWatcherOpts) {
  useEffect(() => {
    if (!elem) return;

    let emitUpdate = (evt: ElementWatcherEventData) => {
      window.requestAnimationFrame(() => onChange(evt));
    };

    if (debounceMs > 0) {
      emitUpdate = throttle(onChange, debounceMs);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const evtData = getElementWatcherEventData(entry.target, entry.contentRect);
        emitUpdate(evtData);
      }
    });

    const onScroll = (evt: Event) => {
      const evtData = getElementWatcherEventData(elem);
      emitUpdate(evtData);
    };

    observer.observe(elem);
    elem.addEventListener("scroll", onScroll);

    return () => {
      observer.disconnect();
      elem.removeEventListener("scroll", onScroll);
    };
  }, [elem, onChange, debounceMs]);
}

export interface ElementWatcherEventData {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  scrollLeft: number;
  scrollTop: number;
  scrollWidth: number;
  scrollHeight: number;
}

export function getElementWatcherEventData(elem: Element, rect?: DOMRect | DOMRectReadOnly): ElementWatcherEventData {
  const { width, height, left, top, right, bottom } = rect ?? elem.getBoundingClientRect();
  const scrollLeft = elem.scrollLeft;
  const scrollTop = elem.scrollTop;
  const scrollWidth = elem.scrollWidth;
  const scrollHeight = elem.scrollHeight;

  return {
    width,
    height,
    left,
    top,
    right,
    bottom,
    scrollHeight,
    scrollTop,
    scrollWidth,
    scrollLeft,
  };
}
