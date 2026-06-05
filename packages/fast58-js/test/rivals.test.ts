import { describe, expect, test } from "bun:test";
import bs58 from "bs58";
import { base58_to_binary, binary_to_base58 } from "base58-js";
import { base58 as scureBase58 } from "@scure/base";
import { decode, encode } from "../src/index.ts";

function makeVector(size: number, seed: number): Uint8Array {
  const bytes = new Uint8Array(size);
  let state = seed | 0;

  for (let i = 0; i < size; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    bytes[i] = state & 0xff;
  }

  return bytes;
}

const sizes = [0, 1, 2, 4, 8, 16, 32, 64, 128, 256];

describe("rivals compatibility (dev-only deps)", () => {
  test("matches bs58, base58-js, and @scure/base", () => {
    for (const size of sizes) {
      const vector = makeVector(size, size ^ 0xabc);
      const expected = bs58.encode(vector);

      expect(encode(vector)).toBe(expected);
      expect(binary_to_base58(vector)).toBe(expected);
      expect(scureBase58.encode(vector)).toBe(expected);

      const decoded = size === 0 ? new Uint8Array(0) : base58_to_binary(expected);
      expect(decode(expected)).toEqual(vector);
      expect(decoded).toEqual(vector);
      expect(scureBase58.decode(expected)).toEqual(vector);
    }
  });
});
