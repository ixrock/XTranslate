// Custom general-purpose interfaces

export {}

declare global {
  // removes "readonly" modifiers from all fields
  export type Writeable<T> = { -readonly [P in keyof T]: T[P] };

  export type WritableDOMRect = Partial<Writeable<DOMRect>>;
}