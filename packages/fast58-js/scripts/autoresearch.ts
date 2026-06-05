/**
 * Auto-research: grid-search encode/decode variants, pick best pair per size bucket.
 * Run: bun run scripts/autoresearch.ts
 */
import bs58 from "bs58";
import { decode as productionDecode } from "../src/decode.ts";
import { encode as productionEncode } from "../src/encode.ts";
import {
  allDecodeCandidates,
  allEncodeCandidates,
  type DecodeFn,
  type EncodeFn,
} from "../src/internal/variants.ts";

const TARGET_MS = 100;
const SAMPLE_COUNT = 4;
const SIZES = [0, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024] as const;

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

function benchmark(fn: () => void): number {
  fn();

  let iterations = 1;
  while (true) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      fn();
    }
    const elapsed = performance.now() - start;

    if (elapsed >= TARGET_MS) {
      return (iterations / elapsed) * 1000;
    }

    const scaled = Math.ceil((iterations * TARGET_MS) / Math.max(elapsed, 0.1));
    iterations = Math.max(iterations * 2, scaled);
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function measure(fn: () => void): number {
  const samples: number[] = [];
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    samples.push(benchmark(fn));
  }
  return median(samples);
}

function verifyEncode(fn: EncodeFn): boolean {
  const vectors = [
    new Uint8Array(0),
    new Uint8Array([0]),
    new Uint8Array([0, 0, 1, 2]),
    new TextEncoder().encode("hello"),
    makeVector(32, 1),
    makeVector(64, 2),
    makeVector(256, 3),
  ];

  for (const vector of vectors) {
    if (fn(vector) !== bs58.encode(vector)) {
      return false;
    }
  }
  return true;
}

function verifyDecode(fn: DecodeFn): boolean {
  const vectors = [
    "",
    "1",
    "11",
    bs58.encode(new TextEncoder().encode("hello")),
    bs58.encode(makeVector(32, 1)),
    bs58.encode(makeVector(64, 2)),
    bs58.encode(makeVector(256, 3)),
  ];

  for (const vector of vectors) {
    const got = fn(vector);
    const want = bs58.decode(vector);
    if (got.length !== want.length) {
      return false;
    }
    for (let i = 0; i < got.length; i++) {
      if (got[i] !== want[i]) {
        return false;
      }
    }
  }
  return true;
}

const cases = SIZES.map((size) => ({
  size,
  data: makeVector(size, size * 17 + 3),
  encoded: bs58.encode(makeVector(size, size * 17 + 3)),
}));

const encodeCandidates = [
  { id: "E:production", fn: productionEncode },
  ...allEncodeCandidates(),
].filter((c) => verifyEncode(c.fn));
const decodeCandidates = [
  { id: "D:production", fn: productionDecode },
  ...allDecodeCandidates(),
].filter((c) => verifyDecode(c.fn));

console.log("fast58-js autoresearch");
console.log(`encode candidates: ${encodeCandidates.length}`);
console.log(`decode candidates: ${decodeCandidates.length}`);
console.log("");

type ScoreRow = { id: string; ops: number };

const bestEncodeBySize = new Map<number, ScoreRow>();
const bestDecodeBySize = new Map<number, ScoreRow>();

for (const { size, data } of cases) {
  let bestEnc: ScoreRow = { id: "", ops: 0 };
  for (const candidate of encodeCandidates) {
    const ops = measure(() => {
      candidate.fn(data);
    });
    if (ops > bestEnc.ops) {
      bestEnc = { id: candidate.id, ops };
    }
  }
  bestEncodeBySize.set(size, bestEnc);

  const encoded = bs58.encode(data);
  let bestDec: ScoreRow = { id: "", ops: 0 };
  for (const candidate of decodeCandidates) {
    const ops = measure(() => {
      candidate.fn(encoded);
    });
    if (ops > bestDec.ops) {
      bestDec = { id: candidate.id, ops };
    }
  }
  bestDecodeBySize.set(size, bestDec);

  console.log(
    `${String(size).padStart(4)}B  enc ${bestEnc.id.padEnd(42)} ${Math.round(bestEnc.ops).toLocaleString()}/s` +
      `  dec ${bestDec.id.padEnd(18)} ${Math.round(bestDec.ops).toLocaleString()}/s`,
  );
}

function gmean(values: number[]): number {
  if (values.length === 0) return 0;
  const logSum = values.reduce((sum, value) => sum + Math.log(value), 0);
  return Math.exp(logSum / values.length);
}

function encodeRankedIdsFromPerSize(map: Map<number, ScoreRow>): string[] {
  return [...new Set([...map.values()].map((row) => row.id))];
}

const shortlistEncodeIds = new Set([
  ...encodeRankedIdsFromPerSize(bestEncodeBySize),
  "E:dispatch-32-64-char",
  "E:dispatch-32-64-concat-mid",
  "E:solana-v1",
  "E:direct+concat",
  "E:mid+concat",
  "E:mid+charAt",
  "E:direct+charCodes",
]);

console.log("\n--- shortlist encode gmean (top per-size winners + dispatch presets) ---");
const encodeRanked = encodeCandidates
  .filter((candidate) => shortlistEncodeIds.has(candidate.id))
  .map((candidate) => ({
    id: candidate.id,
    gmean: gmean(cases.map(({ data }) => measure(() => candidate.fn(data)))),
  }))
  .sort((a, b) => b.gmean - a.gmean)
  .slice(0, 12);

for (const row of encodeRanked) {
  console.log(`  ${row.id.padEnd(48)} ${Math.round(row.gmean).toLocaleString()}/s gmean`);
}

console.log("\n--- decode gmean ---");
const decodeRanked = decodeCandidates
  .map((candidate) => ({
    id: candidate.id,
    gmean: gmean(cases.map(({ encoded }) => measure(() => candidate.fn(encoded)))),
  }))
  .sort((a, b) => b.gmean - a.gmean);

for (const row of decodeRanked) {
  console.log(`  ${row.id.padEnd(24)} ${Math.round(row.gmean).toLocaleString()}/s gmean`);
}

console.log("\n--- recommended hybrid dispatch (per-size winners) ---");
const encIds = [...new Set([...bestEncodeBySize.values()].map((v) => v.id))];
const decIds = [...new Set([...bestDecodeBySize.values()].map((v) => v.id))];
console.log(`encode strategies used: ${encIds.join(", ")}`);
console.log(`decode strategies used: ${decIds.join(", ")}`);

const topEncode = encodeRanked[0]?.id ?? "n/a";
const topDecode = decodeRanked[0]?.id ?? "n/a";
console.log(`\nBEST single encode: ${topEncode}`);
console.log(`BEST single decode: ${topDecode}`);

const bs58Enc = gmean(cases.map(({ data }) => measure(() => bs58.encode(data))));
const bs58Dec = gmean(cases.map(({ encoded }) => measure(() => bs58.decode(encoded))));

const hybridEnc = gmean(cases.map(({ size }) => bestEncodeBySize.get(size)!.ops));
const hybridDec = gmean(cases.map(({ size }) => bestDecodeBySize.get(size)!.ops));

console.log(`\nbs58 encode gmean: ${Math.round(bs58Enc).toLocaleString()}/s`);
console.log(`hybrid-per-size encode gmean: ${Math.round(hybridEnc).toLocaleString()}/s (${(hybridEnc / bs58Enc).toFixed(3)}x)`);
console.log(`bs58 decode gmean: ${Math.round(bs58Dec).toLocaleString()}/s`);
console.log(`hybrid-per-size decode gmean: ${Math.round(hybridDec).toLocaleString()}/s (${(hybridDec / bs58Dec).toFixed(3)}x)`);
