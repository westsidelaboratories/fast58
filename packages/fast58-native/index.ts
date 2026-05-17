import {
  decode as decodeJsWinner,
  encode as encodeJsWinner,
  implementation as jsWinnerImplementation,
} from "./implementations/js/carry-direct-copy.ts";
import {
  getNativeDecode,
  getNativeEncode,
  nativeDecodeWinnerId,
  nativeEncodeWinnerId,
  nativeImplementations,
  nativeLoaded,
} from "./implementations/native.ts";
import { allImplementations } from "./implementations/registry.ts";

export const jsImplementation = jsWinnerImplementation.id;
export const nativeImplementation = {
  decode: nativeDecodeWinnerId,
  encode: nativeEncodeWinnerId,
  available: nativeLoaded,
};

export function encode(data: Buffer | Uint8Array): string {
  return encodeJsWinner(data);
}

export function decode(data: string): Buffer {
  return decodeJsWinner(data);
}

export function encodeBest(data: Buffer | Uint8Array): string {
  return getNativeEncode()(data);
}

export function decodeBest(data: string): Buffer {
  return getNativeDecode()(data);
}

export function encodeStr(data: string): string {
  return encode(Buffer.from(data));
}

export function decodeStr(data: string): string {
  return decode(data).toString();
}

export { allImplementations, nativeImplementations };
