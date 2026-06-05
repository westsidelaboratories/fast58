import {
  ALPHABET,
  ALPHABET_CODES,
  ENCODE_FACTOR,
  LEADING_ZERO,
  LEADING_ZERO_CODE,
} from "./alphabet.ts";
import { decodeCore, encodeCore, encodeCoreMid, type DecodeState, type EncodeState } from "./core.ts";

export type EncodeFn = (data: Uint8Array) => string;
export type DecodeFn = (data: string) => Uint8Array;

function fromCharCodeChunked(codes: Uint16Array): string {
  if (codes.length === 0) return "";

  const chunkSize = 0x8000;
  let result = "";

  for (let i = 0; i < codes.length; i += chunkSize) {
    result += String.fromCharCode(...codes.subarray(i, i + chunkSize));
  }

  return result;
}

function renderEncodeConcat(state: EncodeState): string {
  const { zeroes, digits, first, size } = state;
  let result = zeroes === 0 ? "" : LEADING_ZERO.repeat(zeroes);

  for (let i = first; i < size; i++) {
    result += ALPHABET[digits[i]!];
  }

  return result;
}

function renderEncodeCharAt(state: EncodeState): string {
  const { zeroes, digits, first, size } = state;
  let result = zeroes === 0 ? "" : LEADING_ZERO.repeat(zeroes);

  for (let i = first; i < size; i++) {
    result += ALPHABET.charAt(digits[i]!);
  }

  return result;
}

function renderEncodeCharCodes(state: EncodeState): string {
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

function renderEncodeJoin(state: EncodeState): string {
  const { zeroes, digits, first, size } = state;
  const outLen = zeroes + size - first;
  if (outLen === 0) return "";

  const parts = new Array<string>(outLen);
  for (let i = 0; i < zeroes; i++) {
    parts[i] = LEADING_ZERO;
  }
  for (let i = first; i < size; i++) {
    parts[zeroes + i - first] = ALPHABET[digits[i]!]!;
  }

  return parts.join("");
}

function materializeDecode(state: DecodeState, mode: "copy" | "set"): Uint8Array {
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

function makeRenderer(
  core: (data: Uint8Array) => EncodeState,
  render: (state: EncodeState) => string,
): EncodeFn {
  return (data) => render(core(data));
}

function makeDecode(core: typeof decodeCore, mode: "copy" | "set"): DecodeFn {
  return (data) => {
    const state = core(data);
    if (state === null) {
      return new Uint8Array(0);
    }
    return materializeDecode(state, mode);
  };
}

export const encodeRenderers = {
  concat: renderEncodeConcat,
  charAt: renderEncodeCharAt,
  charCodes: renderEncodeCharCodes,
  join: renderEncodeJoin,
} as const;

export const encodeCores = {
  direct: encodeCore,
  mid: encodeCoreMid,
} as const;

export function buildEncode(id: string, core: keyof typeof encodeCores, render: keyof typeof encodeRenderers): EncodeFn {
  const fn = makeRenderer(encodeCores[core], encodeRenderers[render]);
  Object.defineProperty(fn, "name", { value: id });
  return fn;
}

export function buildDispatchEncode(
  id: string,
  rules: Array<{
    min: number;
    max: number;
    core: keyof typeof encodeCores;
    render: keyof typeof encodeRenderers;
  }>,
  fallback: { core: keyof typeof encodeCores; render: keyof typeof encodeRenderers },
): EncodeFn {
  const compiled = rules.map((rule) => ({
    min: rule.min,
    max: rule.max,
    fn: makeRenderer(encodeCores[rule.core], encodeRenderers[rule.render]),
  }));
  const fallbackFn = makeRenderer(encodeCores[fallback.core], encodeRenderers[fallback.render]);

  const fn: EncodeFn = (data) => {
    const len = data.length;
    for (const rule of compiled) {
      if (len >= rule.min && len <= rule.max) {
        return rule.fn(data);
      }
    }
    return fallbackFn(data);
  };

  Object.defineProperty(fn, "name", { value: id });
  return fn;
}

export const decodeVariants = {
  "direct-copy": makeDecode(decodeCore, "copy"),
  "direct-set": makeDecode(decodeCore, "set"),
} as const;

export function buildFixedEncode32(render: keyof typeof encodeRenderers): EncodeFn {
  const renderFn = encodeRenderers[render];

  return (data) => {
    const len = 32;
    let zeroes = 0;
    let offset = 0;

    while (offset < len && data[offset] === 0) {
      offset++;
      zeroes++;
    }

    if (offset === len) {
      return LEADING_ZERO.repeat(zeroes);
    }

    const size = ((len - offset) * ENCODE_FACTOR + 1) >>> 0;
    const digits = new Uint8Array(size);
    let length = 0;

    while (offset < len) {
      let carry = data[offset]!;
      let written = 0;

      for (let i = size - 1; (carry !== 0 || written < length) && i !== -1; i--, written++) {
        carry += (256 * digits[i]!) >>> 0;
        digits[i] = (carry % 58) >>> 0;
        carry = (carry / 58) >>> 0;
      }

      length = written;
      offset++;
    }

    let first = size - length;
    while (first < size && digits[first] === 0) {
      first++;
    }

    return renderFn({ zeroes, digits, first, size });
  };
}

export function buildFixedEncode64(render: keyof typeof encodeRenderers): EncodeFn {
  const renderFn = encodeRenderers[render];
  const len = 64;

  return (data) => {
    let zeroes = 0;
    let offset = 0;

    while (offset < len && data[offset] === 0) {
      offset++;
      zeroes++;
    }

    if (offset === len) {
      return LEADING_ZERO.repeat(zeroes);
    }

    const size = ((len - offset) * ENCODE_FACTOR + 1) >>> 0;
    const digits = new Uint8Array(size);
    let length = 0;

    while (offset < len) {
      let carry = data[offset]!;
      let written = 0;

      for (let i = size - 1; (carry !== 0 || written < length) && i !== -1; i--, written++) {
        carry += (256 * digits[i]!) >>> 0;
        digits[i] = (carry % 58) >>> 0;
        carry = (carry / 58) >>> 0;
      }

      length = written;
      offset++;
    }

    let first = size - length;
    while (first < size && digits[first] === 0) {
      first++;
    }

    return renderFn({ zeroes, digits, first, size });
  };
}

export function buildSolanaDispatchEncode(): EncodeFn {
  const enc32 = buildFixedEncode32("charCodes");
  const enc64 = buildFixedEncode64("charCodes");
  const mid = buildDispatchEncode(
    "mid",
    [{ min: 8, max: 63, core: "mid", render: "concat" }],
    { core: "direct", render: "concat" },
  );
  const large = makeRenderer(encodeCore, renderEncodeCharCodes);

  return (data) => {
    const len = data.length;
    if (len === 0) return "";
    if (len === 32) return enc32(data);
    if (len === 64) return enc64(data);
    if (len >= 8 && len <= 63) return mid(data);
    if (len >= 128) return large(data);
    return makeRenderer(encodeCore, renderEncodeConcat)(data);
  };
}

export function buildSolanaDispatchDecode(): DecodeFn {
  const copy = decodeVariants["direct-copy"];
  const set = decodeVariants["direct-set"];

  return (data) => {
    const len = data.length;
    if (len >= 128) {
      return set(data);
    }
    return copy(data);
  };
}

export function allEncodeCandidates(): Array<{ id: string; fn: EncodeFn }> {
  const list: Array<{ id: string; fn: EncodeFn }> = [];

  for (const core of Object.keys(encodeCores) as Array<keyof typeof encodeCores>) {
    for (const render of Object.keys(encodeRenderers) as Array<keyof typeof encodeRenderers>) {
      list.push({ id: `E:${core}+${render}`, fn: buildEncode(`${core}+${render}`, core, render) });
    }
  }

  const midRanges = [
    [4, 64],
    [8, 64],
    [8, 96],
    [8, 128],
    [16, 64],
    [16, 128],
  ] as const;

  const fallbacks = [
    { core: "direct" as const, render: "concat" as const },
    { core: "direct" as const, render: "charCodes" as const },
    { core: "mid" as const, render: "charCodes" as const },
  ];

  for (const [min, max] of midRanges) {
    for (const fb of fallbacks) {
      for (const midRender of ["concat", "charAt", "charCodes"] as const) {
        list.push({
          id: `E:mid${min}-${max}/${midRender}+fb${fb.core}+${fb.render}`,
          fn: buildDispatchEncode(
            `mid${min}-${max}`,
            [{ min, max, core: "mid", render: midRender }],
            fb,
          ),
        });
      }
    }
  }

  for (const render of Object.keys(encodeRenderers) as Array<keyof typeof encodeRenderers>) {
    list.push({ id: `E:fixed32+${render}`, fn: buildFixedEncode32(render) });
    list.push({ id: `E:fixed64+${render}`, fn: buildFixedEncode64(render) });
  }

  list.push({
    id: "E:solana-v1",
    fn: buildSolanaDispatchEncode(),
  });

  list.push({
    id: "E:dispatch-32-64-char",
    fn: (data) => {
      const len = data.length;
      if (len === 32) return buildFixedEncode32("charCodes")(data);
      if (len === 64) return buildFixedEncode64("charCodes")(data);
      if (len >= 8 && len <= 127) {
        return makeRenderer(encodeCoreMid, renderEncodeConcat)(data);
      }
      if (len >= 128) {
        return makeRenderer(encodeCore, renderEncodeCharCodes)(data);
      }
      return makeRenderer(encodeCore, renderEncodeConcat)(data);
    },
  });

  list.push({
    id: "E:dispatch-32-64-concat-mid",
    fn: (data) => {
      const len = data.length;
      if (len === 0) return "";
      if (len === 32) return buildFixedEncode32("concat")(data);
      if (len === 64) return buildFixedEncode64("concat")(data);
      if (len >= 8 && len <= 127) {
        return makeRenderer(encodeCoreMid, renderEncodeConcat)(data);
      }
      if (len >= 128) {
        return makeRenderer(encodeCore, renderEncodeCharCodes)(data);
      }
      return makeRenderer(encodeCore, renderEncodeConcat)(data);
    },
  });

  return list;
}

export function allDecodeCandidates(): Array<{ id: string; fn: DecodeFn }> {
  return [
    { id: "D:direct-copy", fn: decodeVariants["direct-copy"] },
    { id: "D:direct-set", fn: decodeVariants["direct-set"] },
    { id: "D:solana-v1", fn: buildSolanaDispatchDecode() },
    {
      id: "D:len128-set",
      fn: (data) => (data.length >= 128 ? decodeVariants["direct-set"](data) : decodeVariants["direct-copy"](data)),
    },
    {
      id: "D:len64-set",
      fn: (data) => (data.length >= 64 ? decodeVariants["direct-set"](data) : decodeVariants["direct-copy"](data)),
    },
  ];
}
