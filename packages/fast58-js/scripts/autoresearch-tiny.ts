/**
 * Focused autoresearch for 1–8B encode (where bs58 often wins).
 */
import bs58 from "bs58";
import { encode as productionEncode } from "../src/encode.ts";
import {
  allEncodeCandidates,
  buildDispatchEncode,
  buildEncode,
  type EncodeFn,
} from "../src/internal/variants.ts";

const SIZES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const TARGET_MS = 80;
const SAMPLES = 4;

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

function bench(fn: () => void): number {
  fn();
  let n = 1;
  while (true) {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) fn();
    const ms = performance.now() - t0;
    if (ms >= TARGET_MS) return (n / ms) * 1000;
    n = Math.max(n * 2, Math.ceil((n * TARGET_MS) / Math.max(ms, 0.1)));
  }
}

function median(vals: number[]): number {
  const s = [...vals].sort((a, b) => a - b);
  return s[(s.length / 2) | 0]!;
}

function measure(fn: () => void): number {
  const samples: number[] = [];
  for (let i = 0; i < SAMPLES; i++) samples.push(bench(fn));
  return median(samples);
}

const extra: Array<{ id: string; fn: EncodeFn }> = [
  { id: "E:production", fn: productionEncode },
  {
    id: "E:basex-style-1-64",
    fn: buildDispatchEncode(
      "basex",
      [{ min: 1, max: 64, core: "mid", render: "charAt" }],
      { core: "mid", render: "charAt" },
    ),
  },
  {
    id: "E:basex-style-1-64-concat",
    fn: buildDispatchEncode(
      "basex-c",
      [{ min: 1, max: 64, core: "mid", render: "concat" }],
      { core: "mid", render: "concat" },
    ),
  },
  { id: "E:mid-charAt-all", fn: buildEncode("mid+charAt", "mid", "charAt") },
  { id: "E:direct-charAt-all", fn: buildEncode("direct+charAt", "direct", "charAt") },
];

const candidates = [...extra, ...allEncodeCandidates()].filter((c) => {
  for (const size of SIZES) {
    const data = makeVector(size, size * 11);
    if (c.fn(data) !== bs58.encode(data)) return false;
  }
  return true;
});

console.log("tiny encode autoresearch", candidates.length, "candidates\n");

for (const size of SIZES) {
  const data = makeVector(size, size * 11);
  const bs58Ops = measure(() => bs58.encode(data));

  let best = { id: "", ops: 0 };
  for (const c of candidates) {
    const ops = measure(() => c.fn(data));
    if (ops > best.ops) best = { id: c.id, ops };
  }

  const ratio = best.ops / bs58Ops;
  console.log(
    `${size}B  bs58 ${Math.round(bs58Ops).toLocaleString()}/s  best ${best.id} ${Math.round(best.ops).toLocaleString()}/s  ${ratio.toFixed(3)}x`,
  );
}
