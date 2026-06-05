import { ALPHABET, ALPHABET_CODES, ENCODE_FACTOR, LEADING_ZERO, LEADING_ZERO_CODE } from "./internal/alphabet.ts";
import { encodeCore, encodeCoreMid, type EncodeState } from "./internal/core.ts";

/**
 * Inlined base-x / bs58 encode (one function — avoids EncodeState allocation on tiny inputs).
 */
function encodeInlinedBaseX(source: Uint8Array): string {
  const pend = source.length;
  let zeroes = 0;
  let pbegin = 0;

  while (pbegin !== pend && source[pbegin] === 0) {
    pbegin++;
    zeroes++;
  }

  const size = ((pend - pbegin) * ENCODE_FACTOR + 1) >>> 0;
  const b58 = new Uint8Array(size);
  let length = 0;

  while (pbegin !== pend) {
    let carry = source[pbegin]!;
    let i = 0;

    for (let it1 = size - 1; (carry !== 0 || i < length) && it1 !== -1; it1--, i++) {
      carry += (256 * b58[it1]!) >>> 0;
      b58[it1] = (carry % 58) >>> 0;
      carry = (carry / 58) >>> 0;
    }

    length = i;
    pbegin++;
  }

  let it2 = size - length;
  while (it2 !== size && b58[it2] === 0) {
    it2++;
  }

  let str = zeroes === 0 ? "" : LEADING_ZERO.repeat(zeroes);
  for (; it2 < size; ++it2) {
    str += ALPHABET.charAt(b58[it2]!);
  }

  return str;
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

function renderConcat(state: EncodeState): string {
  const { zeroes, digits, first, size } = state;
  let result = zeroes === 0 ? "" : LEADING_ZERO.repeat(zeroes);

  for (let i = first; i < size; i++) {
    result += ALPHABET[digits[i]!];
  }

  return result;
}

function renderCharAt(state: EncodeState): string {
  const { zeroes, digits, first, size } = state;
  let result = zeroes === 0 ? "" : LEADING_ZERO.repeat(zeroes);

  for (let i = first; i < size; i++) {
    result += ALPHABET.charAt(digits[i]!);
  }

  return result;
}

function renderCharCodes(state: EncodeState): string {
  const { zeroes, digits, first, size } = state;
  const outLen = zeroes + size - first;
  if (outLen === 0) return "";

  const codes = new Uint16Array(outLen);
  if (zeroes > 0) {
    codes.fill(LEADING_ZERO_CODE, 0, zeroes);
  }
  for (let i = first; i < size; i++) {
    codes[zeroes + i - first] = ALPHABET_CODES[digits[i]!]!;
  }

  return fromCharCodeChunked(codes);
}

const encodeMidCharAt = (data: Uint8Array) => renderCharAt(encodeCoreMid(data));
const encodeMidConcat = (data: Uint8Array) => renderConcat(encodeCoreMid(data));
const encodeDirectConcat = (data: Uint8Array) => renderConcat(encodeCore(data));
const encodeDirectCharCodes = (data: Uint8Array) => renderCharCodes(encodeCore(data));

/**
 * Size-dispatched encode (autoresearch winner mix).
 * - 8-32B: mid core + charAt (incl. Solana 32B pubkeys)
 * - 33-64B: mid core + concat (incl. 64B signatures)
 * - 128B+: direct core + charCodes
 * - else: direct core + concat
 */
export function encode(input: Uint8Array): string {
  const len = input.length;
  if (len === 0) {
    return "";
  }
  if (len <= 8) {
    return encodeInlinedBaseX(input);
  }
  if (len <= 32) {
    return encodeMidCharAt(input);
  }
  if (len <= 64) {
    return encodeMidConcat(input);
  }
  if (len >= 128) {
    return encodeDirectCharCodes(input);
  }
  return encodeDirectConcat(input);
}
