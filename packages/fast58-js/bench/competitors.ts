/**
 * Safely load third-party Base58 packages for benchmarks only.
 * Incompatible or legacy APIs are wrapped or excluded — never imported from src/.
 */
import bs58 from "bs58";
import { base58 as scureBase58 } from "@scure/base";
import { base58_to_binary, binary_to_base58 } from "base58-js";

export interface RivalCandidate {
  name: string;
  encode: (data: Uint8Array) => string;
  decode: (data: string) => Uint8Array;
  notes?: string;
}

function toUint8Array(value: Uint8Array | number[] | Buffer): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }
  return new Uint8Array(value);
}

/** base58-js throws on empty decode; normalize to match bs58. */
const base58Js: RivalCandidate = {
  name: "base58-js",
  encode: (data) => binary_to_base58(data),
  decode: (data) => {
    if (data.length === 0) {
      return new Uint8Array(0);
    }
    return toUint8Array(base58_to_binary(data));
  },
};

const scure: RivalCandidate = {
  name: "@scure/base",
  encode: (data) => scureBase58.encode(data),
  decode: (data) => scureBase58.decode(data),
};

const bs58Pkg: RivalCandidate = {
  name: "bs58",
  encode: (data) => bs58.encode(data),
  decode: (data) => toUint8Array(bs58.decode(data)),
};

/**
 * npm `base58` (jimeh, 2018) encodes integers, not byte buffers — not comparable.
 */
export const skippedRivals: Array<{ name: string; reason: string }> = [
  {
    name: "base58",
    reason: "integer-only API (int_to_base58), not byte[] Base58 — skipped for safety",
  },
];

export function loadRivalCandidates(): RivalCandidate[] {
  return [bs58Pkg, base58Js, scure];
}
