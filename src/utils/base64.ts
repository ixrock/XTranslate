/**
 * Encode/decode utf-8 base64 string
 */
import * as Base64 from "crypto-js/enc-base64";
import * as Utf8 from "crypto-js/enc-utf8";

export const base64 = { decode, encode };

export function decode(data: string): string {
  return Base64.parse(data).toString(Utf8);
}

export function encode(data: string): string {
  return Utf8.parse(data).toString(Base64);
}
