export const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export const BASE = 58;
export const ENCODE_FACTOR = Math.log(256) / Math.log(58);
export const DECODE_FACTOR = 733 / 1000;
export const LEADING_ZERO = "1";
export const LEADING_ZERO_CODE = 49;

export const ALPHABET_CODES = new Uint16Array(ALPHABET.length);
for (let i = 0; i < ALPHABET.length; i++) {
  ALPHABET_CODES[i] = ALPHABET.charCodeAt(i);
}

export const BASE_MAP = new Uint8Array(256);
BASE_MAP.fill(255);
for (let i = 0; i < ALPHABET.length; i++) {
  BASE_MAP[ALPHABET.charCodeAt(i)] = i;
}
