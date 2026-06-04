import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type NativeBinding = {
  encodeBase64?(data: Buffer): string;
  decodeBase64?(data: string): Buffer;
  encodeBase64Slice?(data: Buffer): string;
  decodeBase64Slice?(data: string): Buffer;
};

interface BenchCase {
  label: string;
  data: Buffer;
  encoded: string;
}

interface Candidate {
  id: string;
  encode(data: Buffer): string;
  decode(data: string): Buffer;
}

interface Measurement {
  id: string;
  opsPerSecond: number;
}

const BENCH_TARGET_MS = 160;
const SAMPLE_COUNT = 5;
const DEFAULT_SIZES = [0, 1, 2, 3, 8, 16, 32, 64, 128, 256, 512, 1024, 4096];

function loadNativeBinding(): NativeBinding | null {
  const candidates = [
    `../index.${process.platform}-${process.arch}.node`,
    "../index.darwin-universal.node",
  ];

  for (const path of candidates) {
    try {
      return require(path) as NativeBinding;
    } catch {
      continue;
    }
  }

  return null;
}

function makeBytes(size: number, seed: number): Buffer {
  const bytes = Buffer.alloc(size);
  let state = seed | 0;

  for (let i = 0; i < size; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    bytes[i] = state & 0xff;
  }

  return bytes;
}

function benchmark(fn: () => void, targetMs = BENCH_TARGET_MS): number {
  fn();

  let iterations = 1;
  while (true) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      fn();
    }
    const elapsed = performance.now() - start;

    if (elapsed >= targetMs) {
      return (iterations / elapsed) * 1000;
    }

    const scaled = Math.ceil((iterations * targetMs) / Math.max(elapsed, 0.1));
    iterations = Math.max(iterations * 2, scaled);
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function geometricMean(values: number[]): number {
  const safe = values.filter((value) => value > 0);
  const sum = safe.reduce((acc, value) => acc + Math.log(value), 0);
  return Math.exp(sum / safe.length);
}

function measure(candidates: Candidate[], fn: (candidate: Candidate) => void): Measurement[] {
  return candidates
    .map((candidate) => ({
      id: candidate.id,
      opsPerSecond: median(Array.from({ length: SAMPLE_COUNT }, () => benchmark(() => fn(candidate)))),
    }))
    .sort((a, b) => b.opsPerSecond - a.opsPerSecond);
}

function printMeasurements(title: string, measurements: Measurement[]): void {
  console.log(title);
  measurements.forEach((measurement, index) => {
    console.log(`  ${index + 1}. ${measurement.id.padEnd(18)} ${Math.round(measurement.opsPerSecond).toLocaleString()}/s`);
  });
}

function ensureCorrectness(candidates: Candidate[], cases: BenchCase[]): void {
  for (const benchCase of cases) {
    for (const candidate of candidates) {
      const encoded = candidate.encode(benchCase.data);
      if (encoded !== benchCase.encoded) {
        throw new Error(`${candidate.id} encode mismatch for ${benchCase.label}`);
      }

      const decoded = candidate.decode(benchCase.encoded);
      if (!decoded.equals(benchCase.data)) {
        throw new Error(`${candidate.id} decode mismatch for ${benchCase.label}`);
      }
    }
  }
}

function summarize(title: string, scoreboard: Map<string, number[]>): void {
  const overall = [...scoreboard.entries()]
    .map(([id, values]) => ({ id, score: geometricMean(values) }))
    .sort((a, b) => b.score - a.score);

  console.log(`\nOverall ${title} Winner: ${overall[0]?.id ?? "n/a"}`);
  overall.forEach((entry, index) => {
    console.log(`  ${index + 1}. ${entry.id.padEnd(18)} ${Math.round(entry.score).toLocaleString()}/s gmean`);
  });
}

function parseSizes(argv: string[]): number[] {
  const sizeFlagIndex = argv.indexOf("--sizes");
  const rawSizes = sizeFlagIndex >= 0 ? argv[sizeFlagIndex + 1] : "";
  if (!rawSizes) {
    return DEFAULT_SIZES;
  }

  return rawSizes
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value) && value >= 0);
}

const nativeBinding = loadNativeBinding();
const candidates: Candidate[] = [
  {
    id: "js/buffer",
    encode: (data) => data.toString("base64"),
    decode: (data) => Buffer.from(data, "base64"),
  },
  {
    id: "js/btoa",
    encode: (data) => btoa(data.toString("binary")),
    decode: (data) => Buffer.from(atob(data), "binary"),
  },
];

if (nativeBinding?.encodeBase64 && nativeBinding.decodeBase64) {
  const nativeEncodeBase64 = nativeBinding.encodeBase64;
  const nativeDecodeBase64 = nativeBinding.decodeBase64;
  candidates.push({
    id: "native/base64",
    encode: (data) => nativeEncodeBase64(data),
    decode: (data) => nativeDecodeBase64(data),
  });
}

if (nativeBinding?.encodeBase64Slice && nativeBinding.decodeBase64Slice) {
  const nativeEncodeBase64Slice = nativeBinding.encodeBase64Slice;
  const nativeDecodeBase64Slice = nativeBinding.decodeBase64Slice;
  candidates.push({
    id: "native/slice",
    encode: (data) => nativeEncodeBase64Slice(data),
    decode: (data) => nativeDecodeBase64Slice(data),
  });
}

const sizes = parseSizes(process.argv.slice(2));
const cases = sizes.map((size, index) => {
  const data = makeBytes(size, 0x456789ab ^ (index * 0x9e3779b9));
  return {
    label: `${size}B`,
    data,
    encoded: data.toString("base64"),
  };
});

ensureCorrectness(candidates, cases);

console.log("=".repeat(72));
console.log("base64 scratch benchmark");
console.log(`Validated implementations: ${candidates.map((candidate) => candidate.id).join(", ")}`);
console.log("=".repeat(72));

const encodeScoreboard = new Map<string, number[]>();
const decodeScoreboard = new Map<string, number[]>();
const roundtripScoreboard = new Map<string, number[]>();

for (const benchCase of cases) {
  console.log(`\n${benchCase.label}`);

  const encodeMeasurements = measure(candidates, (candidate) => {
    candidate.encode(benchCase.data);
  });
  printMeasurements("Encode", encodeMeasurements);
  for (const measurement of encodeMeasurements) {
    const current = encodeScoreboard.get(measurement.id) ?? [];
    current.push(measurement.opsPerSecond);
    encodeScoreboard.set(measurement.id, current);
  }

  const decodeMeasurements = measure(candidates, (candidate) => {
    candidate.decode(benchCase.encoded);
  });
  printMeasurements("Decode", decodeMeasurements);
  for (const measurement of decodeMeasurements) {
    const current = decodeScoreboard.get(measurement.id) ?? [];
    current.push(measurement.opsPerSecond);
    decodeScoreboard.set(measurement.id, current);
  }

  const roundtripMeasurements = measure(candidates, (candidate) => {
    candidate.decode(candidate.encode(benchCase.data));
  });
  printMeasurements("Roundtrip", roundtripMeasurements);
  for (const measurement of roundtripMeasurements) {
    const current = roundtripScoreboard.get(measurement.id) ?? [];
    current.push(measurement.opsPerSecond);
    roundtripScoreboard.set(measurement.id, current);
  }
}

console.log("\n" + "=".repeat(72));
summarize("Encode", encodeScoreboard);
summarize("Decode", decodeScoreboard);
summarize("Roundtrip", roundtripScoreboard);
console.log("=".repeat(72));
