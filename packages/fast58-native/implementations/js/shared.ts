import type { ByteInput } from "../types.ts";

export const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export const BASE = 58;
export const ENCODE_FACTOR = Math.log(256) / Math.log(58);
export const DECODE_FACTOR = 733 / 1000;
export const LEADING_ZERO = "1";

export const ALPHABET_CODES = new Uint16Array(ALPHABET.length);
for (let i = 0; i < ALPHABET.length; i++) {
  ALPHABET_CODES[i] = ALPHABET.charCodeAt(i);
}

export const BASE_MAP = new Uint8Array(256);
BASE_MAP.fill(255);
for (let i = 0; i < ALPHABET.length; i++) {
  BASE_MAP[ALPHABET.charCodeAt(i)] = i;
}

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

export function encodeCore(input: ByteInput): EncodeState {
  const data = input instanceof Uint8Array ? input : new Uint8Array(input);
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

export function encodeWithStringConcat(input: ByteInput): string {
  const { zeroes, digits, first, size } = encodeCore(input);
  let result = LEADING_ZERO.repeat(zeroes);

  for (let i = first; i < size; i++) {
    result += ALPHABET[digits[i]];
  }

  return result;
}

export function encodeWithJoin(input: ByteInput): string {
  const { zeroes, digits, first, size } = encodeCore(input);
  const result: string[] = [];
  result.length = zeroes + size - first;

  result.fill(LEADING_ZERO, 0, zeroes);
  for (let i = first; i < size; i++) {
    result[zeroes + i - first] = ALPHABET[digits[i]];
  }

  return result.join("");
}

function fromCharCodeChunked(codes: Uint16Array): string {
  if (codes.length === 0) return "";

  const chunkSize = 0x8000;
  let result = "";

  for (let i = 0; i < codes.length; i += chunkSize) {
    result += String.fromCharCode(...codes.subarray(i, i + chunkSize));
  }

  return result;
}

export function encodeWithCharCodes(input: ByteInput): string {
  const { zeroes, digits, first, size } = encodeCore(input);
  const codes = new Uint16Array(zeroes + size - first);

  codes.fill(ALPHABET_CODES[0], 0, zeroes);
  for (let i = first; i < size; i++) {
    codes[zeroes + i - first] = ALPHABET_CODES[digits[i]];
  }

  return fromCharCodeChunked(codes);
}

export function decodeWithCopy(data: string): Buffer {
  const state = decodeCore(data);
  if (state === null) return Buffer.alloc(0);

  const { zeroes, bytes, first, size } = state;
  const result = Buffer.alloc(zeroes + size - first);
  for (let i = first; i < size; i++) {
    result[zeroes + i - first] = bytes[i];
  }
  return result;
}

export function decodeWithSet(data: string): Buffer {
  const state = decodeCore(data);
  if (state === null) return Buffer.alloc(0);

  const { zeroes, bytes, first, size } = state;
  const result = Buffer.alloc(zeroes + size - first);
  result.set(bytes.subarray(first, size), zeroes);
  return result;
}
