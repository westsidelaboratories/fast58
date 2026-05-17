# fast58-js

Fast Base58 encode/decode for JavaScript and TypeScript.

`fast58-js` is a zero-dependency package with a `bs58`-compatible API shape. It is JavaScript-only: the npm package is built only from `packages/fast58-js/src/index.ts` and ships only `dist`, `index.d.ts`, `README.md`, and `package.json`. Rust/native benchmark code in this repository is not part of this package build or publish output.

## Install

```sh
bun add fast58-js
```

```sh
npm install fast58-js
```

```sh
pnpm add fast58-js
```

```sh
yarn add fast58-js
```

## Usage

```ts
import fast58, { decode, decodeUnsafe, encode } from "fast58-js";

const input = new Uint8Array([104, 101, 108, 108, 111]);

const encoded = encode(input);
const decoded = decode(encoded);
const maybeDecoded = decodeUnsafe(encoded);

fast58.encode(input);
```

## API

- `encode(input: Uint8Array): string`
  Encodes bytes into a Base58 string.
- `decode(input: string): Uint8Array`
  Decodes a Base58 string and throws `Error("Non-base58 character")` on invalid input.
- `decodeUnsafe(input: string): Uint8Array | undefined`
  Decodes a Base58 string and returns `undefined` on invalid input.
- `default`
  Object containing `{ encode, decodeUnsafe, decode }`.

## Runtime Support

- ESM: `dist/index.mjs`
- CommonJS: `dist/index.cjs`
- Bun export condition: `dist/index.bun.mjs`
- Types: `index.d.ts`

## Package Contents

The published tarball is intentionally small and JS-only:

- `dist/index.mjs`
- `dist/index.cjs`
- `dist/index.bun.mjs`
- `index.d.ts`
- `README.md`
- `package.json`

## Development

- `bun run build`
  Builds ESM and CommonJS outputs from `src/index.ts`.
- `bun run bundle`
  Builds ESM, CommonJS, and Bun-specific outputs from `src/index.ts`.
- `bun test`
  Runs package tests.
- `bun run bench`
  Runs a fresh bundle first, then benchmarks `dist/index.bun.mjs`.
- `bun run package:check`
  Rebuilds and runs `npm pack --dry-run` so the release contents can be inspected before publishing.

## Benchmark

Benchmarks were run on April 8, 2026 with:
- `Bun 1.3.11`
- `darwin 25.3.0`
- `arm64`
- bundled artifact under test: `dist/index.bun.mjs`
- external libraries: `bs58/base-x`, `@scure/base`
- methodology: 5 runs per suite, 3 samples per case, median of per-run geometric means

### Overall

Combined encode+decode throughput:

| Suite | fast58-js | Best external | fast58-js vs best external |
| --- | ---: | ---: | ---: |
| Broad Mix | 3,762,094/s | 2,521,962/s | 1.49x |
| 32B Hot Path | 1,188,114/s | 714,990/s | 1.66x |
| 64B Hot Path | 273,479/s | 145,262/s | 1.88x |
| Large Payloads | 8,314/s | 4,091/s | 2.03x |

### Broad Mix Detail

| Library | Encode gmean | Decode gmean | Combined gmean | Encode vs bs58/base-x | Decode vs bs58/base-x |
| --- | ---: | ---: | ---: | ---: | ---: |
| fast58-js | 2,585,411/s | 5,474,315/s | 3,762,094/s | 1.00x | 2.23x |
| bs58/base-x | 2,591,342/s | 2,454,439/s | 2,521,962/s | 1.00x | 1.00x |
| @scure/base | 592,242/s | 610,631/s | 601,366/s | 0.23x | 0.25x |

### 32B Hot Path Detail

| Library | Encode gmean | Decode gmean | Combined gmean | Encode vs bs58/base-x | Decode vs bs58/base-x |
| --- | ---: | ---: | ---: | ---: | ---: |
| fast58-js | 626,666/s | 2,252,582/s | 1,188,114/s | 0.92x | 3.00x |
| bs58/base-x | 680,997/s | 750,680/s | 714,990/s | 1.00x | 1.00x |
| @scure/base | 295,056/s | 288,958/s | 291,991/s | 0.43x | 0.38x |

### 64B Hot Path Detail

| Library | Encode gmean | Decode gmean | Combined gmean | Encode vs bs58/base-x | Decode vs bs58/base-x |
| --- | ---: | ---: | ---: | ---: | ---: |
| fast58-js | 142,802/s | 523,738/s | 273,479/s | 1.00x | 3.54x |
| bs58/base-x | 142,495/s | 148,082/s | 145,262/s | 1.00x | 1.00x |
| @scure/base | 77,835/s | 76,054/s | 76,939/s | 0.55x | 0.51x |

### Large Payload Detail

| Library | Encode gmean | Decode gmean | Combined gmean | Encode vs bs58/base-x | Decode vs bs58/base-x |
| --- | ---: | ---: | ---: | ---: | ---: |
| fast58-js | 4,276/s | 16,168/s | 8,314/s | 1.01x | 4.08x |
| bs58/base-x | 4,223/s | 3,963/s | 4,091/s | 1.00x | 1.00x |
| @scure/base | 2,464/s | 2,432/s | 2,448/s | 0.58x | 0.61x |

`fast58-js` is still the overall winner in every suite above. The current shape is deliberate: encode stays roughly at parity with `bs58/base-x`, while decode remains materially faster across the full range and especially strong in the 32B-64B hot path.
