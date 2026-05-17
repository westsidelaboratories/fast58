import type { Implementation } from "../types.ts";
import { decodeWithCopy, encodeWithStringConcat } from "./shared.ts";

export function encode(data: Buffer | Uint8Array): string {
  return encodeWithStringConcat(data);
}

export function decode(data: string): Buffer {
  return decodeWithCopy(data);
}

export const implementation: Implementation = {
  id: "js/carry-string-copy",
  kind: "js",
  encode,
  decode,
};
