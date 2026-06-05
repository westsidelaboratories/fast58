import { decodeUnsafeToUint8Array } from "./decode.ts";
import { encode } from "./encode.ts";

export { encode } from "./encode.ts";
export { decodeUnsafeToUint8Array as decodeUnsafe } from "./decode.ts";

export function decode(input: string): Uint8Array {
  const output = decodeUnsafeToUint8Array(input);
  if (output !== undefined) {
    return output;
  }

  throw new Error("Non-base58 character");
}

const fast58 = {
  encode,
  decode,
  decodeUnsafe: decodeUnsafeToUint8Array,
};

export default fast58;
