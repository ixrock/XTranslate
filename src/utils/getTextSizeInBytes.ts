// Get size of input text string in bytes

export function getTextSizeInBytes(text: string): number {
  return new TextEncoder().encode(text).length;
}
