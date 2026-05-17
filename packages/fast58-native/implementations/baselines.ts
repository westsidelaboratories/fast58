import { createRequire } from "node:module";
import type { Implementation } from "./types.ts";

const require = createRequire(import.meta.url);
const bs58 = require("bs58").default;

export const bs58Implementation: Implementation = {
  id: "baseline/bs58",
  kind: "baseline",
  encode(data) {
    return bs58.encode(data instanceof Uint8Array ? data : new Uint8Array(data));
  },
  decode(data) {
    try {
      return Buffer.from(bs58.decode(data));
    } catch {
      return Buffer.alloc(0);
    }
  },
};
