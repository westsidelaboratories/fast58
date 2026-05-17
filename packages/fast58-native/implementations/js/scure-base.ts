import { base58 } from "@scure/base";
import type { Implementation } from "../types.ts";

export function encode(data: Buffer | Uint8Array): string {
  return base58.encode(data instanceof Uint8Array ? data : new Uint8Array(data));
}

export function decode(data: string): Buffer {
  try {
    return Buffer.from(base58.decode(data));
  } catch {
    return Buffer.alloc(0);
  }
}

export const implementation: Implementation = {
  id: "js/scure-base",
  kind: "js",
  encode,
  decode,
};
