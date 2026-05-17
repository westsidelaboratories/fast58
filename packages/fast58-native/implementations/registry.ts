import { bs58Implementation } from "./baselines.ts";
import { implementation as jsCarryCharCodesSet } from "./js/carry-charcodes-set.ts";
import { implementation as jsCarryDirectCopy } from "./js/carry-direct-copy.ts";
import { implementation as jsCarryJoinSet } from "./js/carry-join-set.ts";
import { implementation as jsScureBase } from "./js/scure-base.ts";
import { implementation as jsCarryStringCopy } from "./js/carry-string-copy.ts";
import { nativeImplementations } from "./native.ts";

export const jsImplementations = [
  jsCarryDirectCopy,
  jsCarryStringCopy,
  jsCarryJoinSet,
  jsCarryCharCodesSet,
  jsScureBase,
];

export const allImplementations = [
  ...jsImplementations,
  ...nativeImplementations,
  bs58Implementation,
];
