import type { Implementation } from "../types.ts";
import { decodeWithSet, encodeWithJoin } from "./shared.ts";

export function encode(data: Buffer | Uint8Array): string {
  return encodeWithJoin(data);
}

export function decode(data: string): Buffer {
  return decodeWithSet(data);
}

export const implementation: Implementation = {
  id: "js/carry-join-set",
  kind: "js",
  encode,
  decode,
};
