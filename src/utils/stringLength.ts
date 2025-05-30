// Get string length in various forms

export function strLengthInBytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function strLengthCodePoints(text: string): number {
  return Array.from(text).length; // this might be different with `text.length`, e.g. for emojis
}
