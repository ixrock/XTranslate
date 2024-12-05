/**
 * Encode/decode utf-8 base64 string
 */

export function base64Decode(base64: string): string;
export function base64Decode(base64: string, asBinary: true): Uint8Array;
export function base64Decode(base64: string, asBinary?: boolean): Uint8Array | string {
  const binString = atob(base64);
  const binary = Uint8Array.from(binString, (m) => m.codePointAt(0));

  if (asBinary) {
    return binary;
  }
  return new TextDecoder().decode(binary);
}

export function base64Encode(content: Uint8Array | ArrayBuffer | string): string {
  if (typeof content === "string") {
    content = new TextEncoder().encode(content);
  } else if (content instanceof ArrayBuffer) {
    content = new Uint8Array(content).reduce((data, byte) => data + String.fromCharCode(byte), "")
  } else if (content instanceof Uint8Array) {
    content = Array.from(content, (byte) => String.fromCodePoint(byte)).join("");
  }

  return btoa(content as string);
}
