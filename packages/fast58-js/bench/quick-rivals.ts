import bs58 from "bs58";
import fast58 from "../src/index.ts";
import { loadRivalCandidates, skippedRivals } from "./competitors.ts";

const rivals = loadRivalCandidates();
const all = [{ name: "fast58-js", encode: fast58.encode, decode: fast58.decode }, ...rivals];

function vec(n: number, s: number): Uint8Array {
  const b = new Uint8Array(n);
  let st = s | 0;
  for (let i = 0; i < n; i++) {
    st ^= st << 13;
    st ^= st >>> 17;
    st ^= st << 5;
    b[i] = st & 0xff;
  }
  return b;
}

function bench(fn: () => void): number {
  fn();
  let n = 1;
  while (true) {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) fn();
    const ms = performance.now() - t0;
    if (ms >= 100) return (n / ms) * 1000;
    n = Math.max(n * 2, Math.ceil((n * 100) / Math.max(ms, 0.1)));
  }
}

function verify(): void {
  const data = vec(32, 99);
  const enc = bs58.encode(data);
  for (const c of all) {
    if (c.encode(data) !== enc) throw new Error(`${c.name} encode mismatch`);
    const dec = c.decode(enc);
    if (dec.length !== data.length || dec.some((b, i) => b !== data[i])) {
      throw new Error(`${c.name} decode mismatch`);
    }
  }
}

verify();

console.log("quick-rivals (src, 100ms samples)");
for (const skipped of skippedRivals) {
  console.log(`skip ${skipped.name}: ${skipped.reason}`);
}
console.log("");

const sizes = [0, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

for (const size of sizes) {
  const data = vec(size, size * 17 + 3);
  const enc = bs58.encode(data);

  const rows = all.map((c) => {
    const e = bench(() => c.encode(data));
    const d = bench(() => c.decode(enc));
    return { name: c.name, e, d, combined: Math.sqrt(e * d) };
  });

  rows.sort((a, b) => b.combined - a.combined);
  const w = rows[0]!;
  console.log(
    `${String(size).padStart(4)}B  ${w.name.padEnd(12)}  enc ${Math.round(w.e).toLocaleString()}/s  dec ${Math.round(w.d).toLocaleString()}/s`,
  );
}

const gmean = (vals: number[]) => Math.exp(vals.reduce((s, v) => s + Math.log(v), 0) / vals.length);

console.log("\ncombined gmean by library:");
const summary = all
  .map((c) => {
    const combined: number[] = [];
    for (const size of sizes) {
      const data = vec(size, size * 17 + 3);
      const enc = bs58.encode(data);
      const e = bench(() => c.encode(data));
      const d = bench(() => c.decode(enc));
      combined.push(Math.sqrt(e * d));
    }
    return { name: c.name, gmean: gmean(combined) };
  })
  .sort((a, b) => b.gmean - a.gmean);

for (const row of summary) {
  console.log(`  ${row.name.padEnd(12)} ${Math.round(row.gmean).toLocaleString()}/s`);
}
