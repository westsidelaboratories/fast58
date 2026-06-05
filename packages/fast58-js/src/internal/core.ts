import { BASE, BASE_MAP, DECODE_FACTOR, ENCODE_FACTOR, LEADING_ZERO } from "./alphabet.ts";

export interface EncodeState {
  zeroes: number;
  digits: Uint8Array;
  first: number;
  size: number;
}

export interface DecodeState {
  zeroes: number;
  bytes: Uint8Array;
  first: number;
  size: number;
}

export function encodeCore(data: Uint8Array): EncodeState {
  const len = data.length;
  if (len === 0) {
    return { zeroes: 0, digits: new Uint8Array(0), first: 0, size: 0 };
  }

  let zeroes = 0;
  while (zeroes < len && data[zeroes] === 0) zeroes++;

  const size = ((len - zeroes) * ENCODE_FACTOR + 1) | 0;
  const digits = new Uint8Array(size);
  let length = 0;

  for (let i = zeroes; i < len; i++) {
    let carry = data[i];
    let j = size;
    let written = 0;

    while ((carry > 0 || written < length) && j > 0) {
      j--;
      carry += digits[j] << 8;
      digits[j] = carry % BASE;
      carry = (carry / BASE) | 0;
      written++;
    }

    length = written;
  }

  let first = size - length;
  while (first < size && digits[first] === 0) first++;

  return { zeroes, digits, first, size };
}

export function encodeCoreMid(data: Uint8Array): EncodeState {
  const len = data.length;
  let zeroes = 0;
  let offset = 0;

  while (offset < len && data[offset] === 0) {
    offset++;
    zeroes++;
  }

  if (offset === len) {
    return { zeroes, digits: new Uint8Array(0), first: 0, size: 0 };
  }

  const size = ((len - offset) * ENCODE_FACTOR + 1) >>> 0;
  const digits = new Uint8Array(size);
  let length = 0;

  while (offset < len) {
    let carry = data[offset];
    let written = 0;

    for (let i = size - 1; (carry !== 0 || written < length) && i !== -1; i--, written++) {
      carry += (256 * digits[i]) >>> 0;
      digits[i] = (carry % BASE) >>> 0;
      carry = (carry / BASE) >>> 0;
    }

    length = written;
    offset++;
  }

  let first = size - length;
  while (first < size && digits[first] === 0) {
    first++;
  }

  return { zeroes, digits, first, size };
}

export function decodeCore(data: string): DecodeState | null {
  const len = data.length;
  if (len === 0) {
    return { zeroes: 0, bytes: new Uint8Array(0), first: 0, size: 0 };
  }

  let zeroes = 0;
  while (zeroes < len && data[zeroes] === LEADING_ZERO) zeroes++;

  const size = ((len - zeroes) * DECODE_FACTOR + 1) | 0;
  const bytes = new Uint8Array(size);
  let length = 0;

  for (let i = zeroes; i < len; i++) {
    const code = data.charCodeAt(i);
    let carry = code < 256 ? BASE_MAP[code] : 255;
    if (carry === 255) {
      return null;
    }

    let j = size;
    let written = 0;

    while ((carry > 0 || written < length) && j > 0) {
      j--;
      carry += BASE * bytes[j];
      bytes[j] = carry & 255;
      carry >>>= 8;
      written++;
    }

    length = written;
  }

  let first = size - length;
  while (first < size && bytes[first] === 0) first++;

  return { zeroes, bytes, first, size };
}
