import { describe, expect, test } from "bun:test";
import { allImplementations } from "../implementations/registry.ts";
import { bs58Implementation } from "../implementations/baselines.ts";

function makeVector(size: number, seed: number): Buffer {
  const bytes = Buffer.alloc(size);
  let state = seed | 0;

  for (let i = 0; i < size; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    bytes[i] = state & 0xff;
  }

  return bytes;
}

const vectors = [
  Buffer.alloc(0),
  Buffer.from([0]),
  Buffer.from([0, 0]),
  Buffer.from([0, 0, 1, 2, 3, 255]),
  Buffer.from("hello"),
  makeVector(8, 0x0badc0de),
  makeVector(16, 0x1234abcd),
  makeVector(32, 0x1234abcd),
  makeVector(64, 0x87654321),
  makeVector(256, 0xdeadbeef),
];

describe("base58 implementations", () => {
  test("all implementations match bs58 encode/decode", () => {
    for (const vector of vectors) {
      const expectedEncoded = bs58Implementation.encode(vector);

      for (const implementation of allImplementations) {
        expect(implementation.encode(vector)).toBe(expectedEncoded);
        expect(implementation.decode(expectedEncoded)).toEqual(vector);
      }
    }
  });

  test("invalid input returns an empty buffer", () => {
    for (const implementation of allImplementations) {
      expect(implementation.decode("0OIl")).toEqual(Buffer.alloc(0));
    }
  });
});
