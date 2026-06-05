/**
 * Compare fast58-js (bundled) vs fast58 Rust (N-API) vs npm bs58.
 * Run: bun run build:native && bun run bench/rust-vs-js.ts
 */
import { createRequire } from "node:module";
import bs58 from "bs58";

const require = createRequire(import.meta.url);

const { default: fast58Js } = await import(
  new URL("../../fast58-js/dist/index.bun.mjs", import.meta.url).href
);

type NativeBinding = {
  encode(data: Buffer): string;
  decode(data: string): Buffer;
};

function loadNative(): NativeBinding | null {
  const paths = [
    `../index.${process.platform}-${process.arch}.node`,
    "../index.darwin-universal.node",
  ];

  for (const path of paths) {
    try {
      return require(path) as NativeBinding;
    } catch {
      continue;
    }
  }
  return null;
}

const native = loadNative();
if (!native) {
  console.error("Native binding not found. Run: bun run build:native");
  process.exit(1);
}

interface Candidate {
  name: string;
  encode: (data: Uint8Array) => string;
  decode: (data: string) => Uint8Array;
}

const candidates: Candidate[] = [
  { name: "fast58-js", encode: fast58Js.encode, decode: fast58Js.decode },
  {
    name: "fast58-rust",
    encode: (data) => native.encode(Buffer.from(data)),
    decode: (data) => new Uint8Array(native.decode(data)),
  },
  {
    name: "bs58",
    encode: bs58.encode,
    decode: (data) => new Uint8Array(bs58.decode(data)),
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

function bench(fn: () => void): number {
  fn();
  let iterations = 1;
  while (true) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    const elapsed = performance.now() - start;
    if (elapsed >= 120) return (iterations / elapsed) * 1000;
    iterations = Math.max(iterations * 2, Math.ceil((iterations * 120) / Math.max(elapsed, 0.1)));
  }
}

const sizes = [0, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

console.log("fast58-js vs fast58-rust vs bs58\n");

for (const size of sizes) {
  const data = makeVector(size, size * 17 + 3);
  const encoded = bs58.encode(data);

  for (const c of candidates) {
    if (c.encode(data) !== encoded) {
      throw new Error(`${c.name} encode mismatch at ${size}B`);
    }
    const decoded = c.decode(encoded);
    if (decoded.length !== data.length || decoded.some((b, i) => b !== data[i])) {
      throw new Error(`${c.name} decode mismatch at ${size}B`);
    }
  }

  const rows = candidates
    .map((c) => {
      const e = bench(() => c.encode(data));
      const d = bench(() => c.decode(encoded));
      return { name: c.name, e, d, combined: Math.sqrt(e * d) };
    })
    .sort((a, b) => b.combined - a.combined);

  const w = rows[0]!;
  console.log(
    `${String(size).padStart(4)}B  ${w.name.padEnd(12)}  enc ${Math.round(w.e).toLocaleString()}/s  dec ${Math.round(w.d).toLocaleString()}/s`,
  );
}

const gmean = (vals: number[]) =>
  Math.exp(vals.reduce((s, v) => s + Math.log(v), 0) / vals.length);

console.log("\ncombined gmean:");
for (const c of candidates) {
  const scores: number[] = [];
  for (const size of sizes) {
    const data = makeVector(size, size * 17 + 3);
    const encoded = bs58.encode(data);
    const e = bench(() => c.encode(data));
    const d = bench(() => c.decode(encoded));
    scores.push(Math.sqrt(e * d));
  }
  console.log(`  ${c.name.padEnd(12)} ${Math.round(gmean(scores)).toLocaleString()}/s`);
}
