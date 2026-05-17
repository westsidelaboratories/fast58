export type ByteInput = Buffer | Uint8Array;
export type ImplementationKind = "js" | "native" | "baseline";

export interface Implementation {
  id: string;
  kind: ImplementationKind;
  encode(data: ByteInput): string;
  decode(data: string): Buffer;
}
