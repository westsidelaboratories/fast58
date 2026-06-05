import { decodeCore } from "./internal/core.ts";

function decodeToBytes(data: string, mode: "copy" | "set"): Uint8Array {
  const state = decodeCore(data);
  if (state === null) {
    return new Uint8Array(0);
  }

  const { zeroes, bytes, first, size } = state;
  const outLen = zeroes + size - first;
  const result = new Uint8Array(outLen);

  if (zeroes > 0) {
    result.fill(0, 0, zeroes);
  }

  if (mode === "set") {
    result.set(bytes.subarray(first, size), zeroes);
  } else {
    for (let source = first, dest = zeroes; source < size; source++, dest++) {
      result[dest] = bytes[source]!;
    }
  }

  return result;
}

/**
 * Length-dispatched decode (autoresearch: copy for short strings, set for long).
 */
export function decodeToUint8Array(data: string): Uint8Array {
  if (data.length >= 64) {
    return decodeToBytes(data, "set");
  }
  return decodeToBytes(data, "copy");
}

export function decodeUnsafeToUint8Array(data: string): Uint8Array | undefined {
  const state = decodeCore(data);
  if (state === null) {
    return undefined;
  }

  const { zeroes, bytes, first, size } = state;
  const outLen = zeroes + size - first;
  const result = new Uint8Array(outLen);

  if (zeroes > 0) {
    result.fill(0, 0, zeroes);
  }

  if (data.length >= 64) {
    result.set(bytes.subarray(first, size), zeroes);
  } else {
    for (let source = first, dest = zeroes; source < size; source++, dest++) {
      result[dest] = bytes[source]!;
    }
  }

  return result;
}
