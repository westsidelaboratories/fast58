import bs58 from "bs58";
import { base58 } from "@scure/base";

const { default: fast58 } = await import(new URL("../dist/index.bun.mjs", import.meta.url).href);

interface Candidate {
  name: string;
  encode(data: Uint8Array): string;
  decode(data: string): Uint8Array;
}

interface BenchCase {
  label: string;
  data: Uint8Array;
  encoded: string;
}

interface Suite {
  label: string;
  sizes: number[];
  inputStyle: "mixed" | "no-leading-zero" | "leading-zero-heavy";
}

interface RunSummary {
  encode: number;
  decode: number;
}

const TARGET_MS = 120;
const SAMPLE_COUNT = 3;
const RUN_COUNT = 5;
const BS58_BASELINE_NAME = "bs58/base-x";

const suites: Suite[] = [
  {
    label: "Broad Mix",
    sizes: [0, 1, 2, 4, 8, 16, 32, 64, 128, 256],
    inputStyle: "mixed",
  },
  {
    label: "32B Hot Path",
    sizes: [32],
    inputStyle: "mixed",
  },
  {
    label: "64B Hot Path",
    sizes: [64],
    inputStyle: "mixed",
  },
  {
    label: "Large Payloads",
    sizes: [128, 256, 512, 1024],
    inputStyle: "mixed",
  },
  {
    label: "Random No Leading Zero",
    sizes: [1, 2, 4, 8, 16, 32, 64, 128, 256],
    inputStyle: "no-leading-zero",
  },
  {
    label: "Leading Zero Heavy",
    sizes: [8, 16, 32, 64, 128, 256],
    inputStyle: "leading-zero-heavy",
  },
];

const candidates: Candidate[] = [
  {
    name: "fast58-js",
    encode: fast58.encode,
    decode: fast58.decode,
  },
  {
    name: BS58_BASELINE_NAME,
    encode: bs58.encode,
    decode: bs58.decode,
  },
  {
    name: "scure/base",
    encode: base58.encode,
    decode: base58.decode,
  },
];

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
  return sorted[(sorted.length / 2) | 0];
}

function geometricMean(values: number[]): number {
  let sum = 0;
  for (const value of values) {
    sum += Math.log(value);
  }
  return Math.exp(sum / values.length);
}

function ensureNoLeadingZero(data: Uint8Array, seed: number): void {
  if (data.length === 0) {
    return;
  }

  if (data[0] === 0) {
    data[0] = (seed & 0xff) || 1;
  }
}

function makeLeadingZeroHeavy(data: Uint8Array, seed: number): void {
  const size = data.length;
  if (size === 0) {
    return;
  }

  const zeroCount = Math.min(size - 1, Math.max(1, Math.floor(size / 4)));
  data.fill(0, 0, zeroCount);
  if (zeroCount < size && data[zeroCount] === 0) {
    data[zeroCount] = (seed & 0xff) || 1;
  }
}

function makeCases(suite: Suite): BenchCase[] {
  const { inputStyle, sizes } = suite;
  return sizes.map((size, index) => {
    const seed = 0x12345678 ^ (index * 0x9e3779b9);
    const data = makeVector(size, seed);

    if (inputStyle === "mixed") {
      if (size >= 8 && index % 2 === 0) data[0] = 0;
      if (size >= 16 && index % 3 === 0) data[1] = 0;
    } else if (inputStyle === "no-leading-zero") {
      ensureNoLeadingZero(data, seed);
    } else {
      makeLeadingZeroHeavy(data, seed);
    }

    return {
      label: `${size}B`,
      data,
      encoded: bs58.encode(data),
    };
  });
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

function ensureCorrectness(cases: BenchCase[]): void {
  for (const benchCase of cases) {
    for (const candidate of candidates) {
      const encoded = candidate.encode(benchCase.data);
      if (encoded !== benchCase.encoded) {
        throw new Error(`${candidate.name} encode mismatch for ${benchCase.label}`);
      }

      const decoded = candidate.decode(benchCase.encoded);
      if (!sameBytes(decoded, benchCase.data)) {
        throw new Error(`${candidate.name} decode mismatch for ${benchCase.label}`);
      }
    }
  }
}

function measureCase(candidate: Candidate, benchCase: BenchCase, mode: "encode" | "decode"): number {
  const samples = Array.from({ length: SAMPLE_COUNT }, () =>
    benchmark(() => {
      if (mode === "encode") {
        candidate.encode(benchCase.data);
        return;
      }

      candidate.decode(benchCase.encoded);
    }),
  );

  return median(samples);
}

function measureSuite(cases: BenchCase[]): Map<string, RunSummary[]> {
  const runs = new Map<string, RunSummary[]>();

  for (let run = 0; run < RUN_COUNT; run++) {
    console.log(`\nRun ${run + 1}/${RUN_COUNT}`);
    const encodeScores = new Map<string, number[]>();
    const decodeScores = new Map<string, number[]>();

    for (const benchCase of cases) {
      const encodeResults = candidates
        .map((candidate) => ({
          name: candidate.name,
          score: measureCase(candidate, benchCase, "encode"),
        }))
        .sort((a, b) => b.score - a.score);

      const decodeResults = candidates
        .map((candidate) => ({
          name: candidate.name,
          score: measureCase(candidate, benchCase, "decode"),
        }))
        .sort((a, b) => b.score - a.score);

      console.log(
        `  ${benchCase.label} encode: ${encodeResults.map((result) => `${result.name} ${Math.round(result.score).toLocaleString()}/s`).join(" | ")}`,
      );
      console.log(
        `  ${benchCase.label} decode: ${decodeResults.map((result) => `${result.name} ${Math.round(result.score).toLocaleString()}/s`).join(" | ")}`,
      );

      for (const result of encodeResults) {
        const current = encodeScores.get(result.name) ?? [];
        current.push(result.score);
        encodeScores.set(result.name, current);
      }

      for (const result of decodeResults) {
        const current = decodeScores.get(result.name) ?? [];
        current.push(result.score);
        decodeScores.set(result.name, current);
      }
    }

    for (const candidate of candidates) {
      const current = runs.get(candidate.name) ?? [];
      current.push({
        encode: geometricMean(encodeScores.get(candidate.name) ?? []),
        decode: geometricMean(decodeScores.get(candidate.name) ?? []),
      });
      runs.set(candidate.name, current);
    }
  }

  return runs;
}

function medianMode(runs: RunSummary[], mode: "encode" | "decode"): number {
  return median(runs.map((run) => run[mode]));
}

function printSuiteSummary(label: string, runs: Map<string, RunSummary[]>): void {
  console.log(`\n${label}`);
  console.log(`| Library | Encode gmean | Decode gmean | Combined gmean | Encode vs ${BS58_BASELINE_NAME} | Decode vs ${BS58_BASELINE_NAME} |`);
  console.log("| --- | ---: | ---: | ---: | ---: | ---: |");

  const bs58Runs = runs.get(BS58_BASELINE_NAME);
  if (!bs58Runs) {
    throw new Error(`Missing ${BS58_BASELINE_NAME} baseline`);
  }

  const bs58Encode = medianMode(bs58Runs, "encode");
  const bs58Decode = medianMode(bs58Runs, "decode");

  const rows = [...runs.entries()]
    .map(([name, values]) => {
      const encode = medianMode(values, "encode");
      const decode = medianMode(values, "decode");
      return {
        name,
        encode,
        decode,
        combined: geometricMean([encode, decode]),
      };
    })
    .sort((a, b) => b.combined - a.combined);

  for (const row of rows) {
    console.log(
      `| ${row.name} | ${Math.round(row.encode).toLocaleString()}/s | ${Math.round(row.decode).toLocaleString()}/s | ${Math.round(row.combined).toLocaleString()}/s | ${(row.encode / bs58Encode).toFixed(2)}x | ${(row.decode / bs58Decode).toFixed(2)}x |`,
    );
  }

  console.log(`\nWinner: ${rows[0]?.name ?? "n/a"} (combined encode+decode median gmean)`);
}

function printOverallSummary(results: Array<{ suite: Suite; runs: Map<string, RunSummary[]> }>): void {
  console.log("\nOverall");
  console.log("| Suite | fast58 combined | best external combined | fast58 vs best external |");
  console.log("| --- | ---: | ---: | ---: |");

  for (const { suite, runs } of results) {
    const rows = [...runs.entries()]
      .map(([name, values]) => {
        const encode = medianMode(values, "encode");
        const decode = medianMode(values, "decode");
        return {
          name,
          combined: geometricMean([encode, decode]),
        };
      })
      .sort((a, b) => b.combined - a.combined);

    const fast = rows.find((row) => row.name === "fast58");
    const bestExternal = rows.find((row) => row.name !== "fast58");
    if (!fast || !bestExternal) {
      continue;
    }

    console.log(
      `| ${suite.label} | ${Math.round(fast.combined).toLocaleString()}/s | ${Math.round(bestExternal.combined).toLocaleString()}/s | ${(fast.combined / bestExternal.combined).toFixed(2)}x |`,
    );
  }
}

console.log("fast58-js benchmark");
console.log("===================");
console.log("Artifact under test: dist/index.bun.mjs");
console.log(`Runs per suite: ${RUN_COUNT}`);
console.log(`Samples per case: ${SAMPLE_COUNT}`);

const results: Array<{ suite: Suite; runs: Map<string, RunSummary[]> }> = [];

for (const suite of suites) {
  const cases = makeCases(suite);
  console.log(`\n${suite.label}`);
  ensureCorrectness(cases);
  const runs = measureSuite(cases);
  printSuiteSummary(`${suite.label} summary`, runs);
  results.push({ suite, runs });
}

printOverallSummary(results);
