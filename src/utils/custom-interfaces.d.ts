// Custom general-purpose interfaces

export {}

declare global {
  export type PartialWriteable<T> = Partial<{ -readonly [P in keyof T]: T[P]; }>;
}