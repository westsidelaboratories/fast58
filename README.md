<p align="center">
  <img src="./logo.png" alt="fast58 logo" width="400" />
</p>

<p align="center">
  <img alt="Bun" src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Rust" src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white" />
  <img alt="Oxlint" src="https://img.shields.io/badge/Oxlint-111827?style=for-the-badge&logo=oxc&logoColor=white" />
</p>

# fast58

Base58 encode/decode with a published JavaScript package and a separate internal native benchmark lab.

## Install

```sh
bun add fast58-js
```

```sh
npm install fast58-js
```

The npm package is JS-only. It builds from `packages/fast58-js/src/index.ts` and publishes only the allowlisted package files from `packages/fast58-js/package.json`.

## Monorepo Layout

The main release target is the JavaScript package published as `fast58-js`. The Rust/N-API experiments and cross-implementation benchmarks live in a separate private workspace package.

- `packages/fast58-js`: published npm package
- `packages/fast58-native`: private Rust/N-API benchmark lab
- `packages/fast58-native/implementations/js/*`: named JS algorithm candidates
- `packages/fast58-native/implementations/native.ts`: native binding loader and candidate registry
- `packages/fast58-native/bench/run.ts`: shared benchmark runner
- `packages/fast58-native/test/correctness.test.ts`: cross-implementation correctness coverage
- `packages/fast58-native/src/algorithms/*`: Rust candidate implementations

## Commands

```sh
bun test
bun run build:js
bun run bench
bun run build:native
```

## Public API

```ts
import fast58 from "fast58-js";

const encoded = fast58.encode(new Uint8Array([104, 101, 108, 108, 111]));
const decoded = fast58.decode(encoded);
```

- `encode`: encode a `Uint8Array` as Base58
- `decode`: decode a Base58 string and throw on invalid input
- `decodeUnsafe`: decode a Base58 string and return `undefined` on invalid input

## Benchmarking

The benchmark runner validates every implementation against `bs58`, measures encode and decode separately, and reports suite winners for:

- broad mixed payloads
- 32-byte hot paths
- 64-byte hot paths
- large payloads

That lets you add a new algorithm, register it once, and compare it against every existing candidate without rewriting the harness.

## Benchmark lookup table (fast58 vs npm `bs58`)

Measured with `bun run bench` on April 8, 2026 (UTC). Values are exact throughput from the benchmark output.

### Broad Mix (0B–256B)

| Operation | fast58 winner | fast58 gmean ops/s | npm `bs58` gmean ops/s | fast58 vs `bs58` |
| --- | --- | ---: | ---: | ---: |
| Encode | `js/carry-direct-copy` | 2,611,041 | 2,332,248 | **1.12x faster** |
| Decode | `js/carry-direct-copy` | 4,132,217 | 1,771,628 | **2.33x faster** |

### 32-byte Hot Path

| Operation | fast58 winner | fast58 gmean ops/s | npm `bs58` gmean ops/s | fast58 vs `bs58` |
| --- | --- | ---: | ---: | ---: |
| Encode | `js/carry-direct-copy` | 583,902 | 585,869 | 0.997x (near parity) |
| Decode | `js/carry-direct-copy` | 2,054,119 | 650,263 | **3.16x faster** |

### 64-byte Hot Path

| Operation | fast58 winner | fast58 gmean ops/s | npm `bs58` gmean ops/s | fast58 vs `bs58` |
| --- | --- | ---: | ---: | ---: |
| Encode | `js/carry-direct-copy` | 145,854 | 143,991 | **1.01x faster** |
| Decode | `js/carry-direct-copy` | 536,492 | 147,720 | **3.63x faster** |

### Large Payloads (128B–1024B)

| Operation | fast58 winner | fast58 gmean ops/s | npm `bs58` gmean ops/s | fast58 vs `bs58` |
| --- | --- | ---: | ---: | ---: |
| Encode | `js/carry-string-copy` | 4,248 | 4,190 | **1.01x faster** |
| Decode | `js/carry-direct-copy` | 16,079 | 3,929 | **4.09x faster** |

### Broad Mix detail by payload size (`fast58 js current` vs npm `bs58`)

| Size | Encode fast58 | Encode `bs58` | Encode ratio | Decode fast58 | Decode `bs58` | Decode ratio |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 0B | 351,682,466/s | 155,308,749/s | **2.26x** | 57,595,264/s | 29,440,919/s | **1.96x** |
| 1B | 62,464,613/s | 54,353,920/s | **1.15x** | 44,391,834/s | 28,028,228/s | **1.58x** |
| 2B | 43,614,906/s | 37,017,402/s | **1.18x** | 38,659,282/s | 24,298,538/s | **1.59x** |
| 4B | 20,565,540/s | 18,814,911/s | **1.09x** | 29,193,032/s | 15,924,983/s | **1.83x** |
| 8B | 10,324,255/s | 10,934,733/s | 0.94x | 15,932,578/s | 10,978,727/s | **1.45x** |
| 16B | 2,594,950/s | 2,635,188/s | 0.98x | 6,539,674/s | 2,845,546/s | **2.30x** |
| 32B | 634,977/s | 650,343/s | 0.98x | 2,184,630/s | 734,017/s | **2.98x** |
| 64B | 136,165/s | 140,237/s | 0.97x | 536,357/s | 149,289/s | **3.59x** |
| 128B | 36,012/s | 34,761/s | **1.04x** | 127,827/s | 33,640/s | **3.80x** |
| 256B | 8,960/s | 8,865/s | **1.01x** | 32,234/s | 8,283/s | **3.89x** |

For the generic arbitrary-length implementations, the current fixed winners are:

- JS: `js/carry-direct-copy`
- Rust encode: `native/bs58-u32`
- Rust decode: `native/bs58-rs`
