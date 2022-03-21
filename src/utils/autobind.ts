// Decorator for binding class methods to self context

import autoBindClass, { Options } from "auto-bind";
import autoBindReactClass from "auto-bind/react";

// Automatically bind methods to their class instance
export function autoBind<T extends object>(obj: T, opts?: Options): T {
  if ("componentWillUnmount" in obj) {
    return autoBindReactClass(obj as any, opts);
  }

  return autoBindClass(obj, opts);
}
