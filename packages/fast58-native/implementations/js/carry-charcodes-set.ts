import type { Implementation } from "../types.ts";
import { decodeWithSet, encodeWithCharCodes } from "./shared.ts";

export function encode(data: Buffer | Uint8Array): string {
  return encodeWithCharCodes(data);
}

export function decode(data: string): Buffer {
  return decodeWithSet(data);
}

export const implementation: Implementation = {
  id: "js/carry-charcodes-set",
  kind: "js",
  encode,
  decode,
};
