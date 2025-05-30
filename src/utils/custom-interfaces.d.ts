// Custom general-purpose interfaces

export {}

declare global {
  // removes "readonly" modifiers from all fields
  export type Writeable<T> = { -readonly [P in keyof T]: T[P] };

  export type WritableDOMRect = Partial<Writeable<DOMRect>>;

  export type ValueOf<T> = T[keyof T];

  export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
  }
}