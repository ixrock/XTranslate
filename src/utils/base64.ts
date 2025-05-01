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
  let bytes: Uint8Array;

  if (typeof content === "string") {
    bytes = new TextEncoder().encode(content);
  } else if (content instanceof ArrayBuffer) {
    bytes = new Uint8Array(content);
  } else if (content instanceof Uint8Array) {
    bytes = content;
  } else {
    throw new Error("Unexpected content type");
  }

  const binaryString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binaryString);
}
