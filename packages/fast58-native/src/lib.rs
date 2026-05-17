use napi::bindgen_prelude::*;
use napi_derive::napi;

mod algorithms;

#[napi(js_name = "encode")]
#[inline(always)]
pub fn napi_encode(data: Buffer) -> String {
    algorithms::bs58_u32::encode(&data)
}

#[napi(js_name = "decode")]
#[inline(always)]
pub fn napi_decode(data: String) -> Buffer {
    Buffer::from(algorithms::bs58_rs::decode(&data))
}

#[napi(js_name = "encodeIter")]
#[inline(always)]
pub fn napi_encode_iter(data: Buffer) -> String {
    algorithms::carry_iter::encode(&data)
}

#[napi(js_name = "decodeIter")]
#[inline(always)]
pub fn napi_decode_iter(data: String) -> Buffer {
    Buffer::from(algorithms::carry_iter::decode(&data))
}

#[napi(js_name = "encodeWhile")]
#[inline(always)]
pub fn napi_encode_while(data: Buffer) -> String {
    algorithms::carry_while::encode(&data)
}

#[napi(js_name = "decodeWhile")]
#[inline(always)]
pub fn napi_decode_while(data: String) -> Buffer {
    Buffer::from(algorithms::carry_while::decode(&data))
}

#[napi(js_name = "encodeBs58Rs")]
#[inline(always)]
pub fn napi_encode_bs58_rs(data: Buffer) -> String {
    algorithms::bs58_rs::encode(&data)
}

#[napi(js_name = "decodeBs58Rs")]
#[inline(always)]
pub fn napi_decode_bs58_rs(data: String) -> Buffer {
    Buffer::from(algorithms::bs58_rs::decode(&data))
}

#[napi(js_name = "encodeBs58Port")]
#[inline(always)]
pub fn napi_encode_bs58_port(data: Buffer) -> String {
    algorithms::bs58_port::encode(&data)
}

#[napi(js_name = "decodeBs58Port")]
#[inline(always)]
pub fn napi_decode_bs58_port(data: String) -> Buffer {
    Buffer::from(algorithms::bs58_port::decode(&data))
}

#[napi(js_name = "encodeBs58Opt")]
#[inline(always)]
pub fn napi_encode_bs58_opt(data: Buffer) -> String {
    algorithms::bs58_opt::encode(&data)
}

#[napi(js_name = "decodeBs58Opt")]
#[inline(always)]
pub fn napi_decode_bs58_opt(data: String) -> Buffer {
    Buffer::from(algorithms::bs58_opt::decode(&data))
}

#[napi(js_name = "encodeBs58U32")]
#[inline(always)]
pub fn napi_encode_bs58_u32(data: Buffer) -> String {
    algorithms::bs58_u32::encode(&data)
}

#[napi(js_name = "decodeBs58U32")]
#[inline(always)]
pub fn napi_decode_bs58_u32(data: String) -> Buffer {
    Buffer::from(algorithms::bs58_u32::decode(&data))
}

#[napi(js_name = "encodeFdFixed")]
#[inline(always)]
pub fn napi_encode_fd_fixed(data: Buffer) -> String {
    algorithms::fd_fixed::encode(&data)
}

#[napi(js_name = "decodeFdFixed")]
#[inline(always)]
pub fn napi_decode_fd_fixed(data: String) -> Buffer {
    Buffer::from(algorithms::fd_fixed::decode(&data))
}

#[napi(js_name = "encodeFive8Fixed")]
#[inline(always)]
pub fn napi_encode_five8_fixed(data: Buffer) -> String {
    algorithms::five8_fixed::encode(&data)
}

#[napi(js_name = "decodeFive8Fixed")]
#[inline(always)]
pub fn napi_decode_five8_fixed(data: String) -> Buffer {
    Buffer::from(algorithms::five8_fixed::decode(&data))
}

#[napi(js_name = "encodeHybridFive8Bs58")]
#[inline(always)]
pub fn napi_encode_hybrid_five8_bs58(data: Buffer) -> String {
    algorithms::hybrid_five8_bs58::encode(&data)
}

#[napi(js_name = "decodeHybridFive8Bs58")]
#[inline(always)]
pub fn napi_decode_hybrid_five8_bs58(data: String) -> Buffer {
    Buffer::from(algorithms::hybrid_five8_bs58::decode(&data))
}

#[napi(js_name = "encodeHybridFive8Carry")]
#[inline(always)]
pub fn napi_encode_hybrid_five8_carry(data: Buffer) -> String {
    algorithms::hybrid_five8_carry::encode(&data)
}

#[napi(js_name = "decodeHybridFive8Carry")]
#[inline(always)]
pub fn napi_decode_hybrid_five8_carry(data: String) -> Buffer {
    Buffer::from(algorithms::hybrid_five8_carry::decode(&data))
}

#[cfg(test)]
mod tests {
    use super::algorithms::{carry_iter, carry_while};

    #[test]
    fn test_known_vector() {
        assert_eq!(carry_iter::encode(b"hello"), "Cn8eVZg");
        assert_eq!(carry_while::encode(b"hello"), "Cn8eVZg");
        assert_eq!(carry_iter::decode("Cn8eVZg"), b"hello");
        assert_eq!(carry_while::decode("Cn8eVZg"), b"hello");
    }

    #[test]
    fn test_leading_zeroes() {
        let data = b"\x00\x00hello";
        let encoded = "11Cn8eVZg";
        assert_eq!(carry_iter::encode(data), encoded);
        assert_eq!(carry_while::encode(data), encoded);
        assert_eq!(carry_iter::decode(encoded), data);
        assert_eq!(carry_while::decode(encoded), data);
    }

    #[test]
    fn test_roundtrip_variants_match() {
        let data = [0, 0, 1, 2, 3, 255];
        let encoded_iter = carry_iter::encode(&data);
        let encoded_while = carry_while::encode(&data);

        assert_eq!(encoded_iter, encoded_while);
        assert_eq!(carry_iter::decode(&encoded_iter), data);
        assert_eq!(carry_while::decode(&encoded_while), data);
    }

    #[test]
    fn test_external_variants_match() {
        let data32 = [7u8; 32];
        let data64 = [9u8; 64];

        let encoded32 = carry_iter::encode(&data32);
        let encoded64 = carry_iter::encode(&data64);

        assert_eq!(super::algorithms::bs58_u32::encode(&data32), encoded32);
        assert_eq!(super::algorithms::bs58_opt::encode(&data32), encoded32);
        assert_eq!(super::algorithms::bs58_port::encode(&data32), encoded32);
        assert_eq!(super::algorithms::bs58_rs::encode(&data32), encoded32);
        assert_eq!(super::algorithms::fd_fixed::encode(&data32), encoded32);
        assert_eq!(super::algorithms::five8_fixed::encode(&data32), encoded32);
        assert_eq!(
            super::algorithms::hybrid_five8_bs58::encode(&data32),
            encoded32
        );
        assert_eq!(
            super::algorithms::hybrid_five8_carry::encode(&data32),
            encoded32
        );

        assert_eq!(super::algorithms::bs58_u32::encode(&data64), encoded64);
        assert_eq!(super::algorithms::bs58_opt::encode(&data64), encoded64);
        assert_eq!(super::algorithms::bs58_port::encode(&data64), encoded64);
        assert_eq!(super::algorithms::bs58_rs::encode(&data64), encoded64);
        assert_eq!(super::algorithms::fd_fixed::encode(&data64), encoded64);
        assert_eq!(super::algorithms::five8_fixed::encode(&data64), encoded64);
        assert_eq!(
            super::algorithms::hybrid_five8_bs58::encode(&data64),
            encoded64
        );
        assert_eq!(
            super::algorithms::hybrid_five8_carry::encode(&data64),
            encoded64
        );

        assert_eq!(super::algorithms::bs58_u32::decode(&encoded32), data32);
        assert_eq!(super::algorithms::bs58_opt::decode(&encoded32), data32);
        assert_eq!(super::algorithms::bs58_port::decode(&encoded32), data32);
        assert_eq!(super::algorithms::bs58_rs::decode(&encoded32), data32);
        assert_eq!(super::algorithms::fd_fixed::decode(&encoded32), data32);
        assert_eq!(super::algorithms::five8_fixed::decode(&encoded32), data32);
        assert_eq!(
            super::algorithms::hybrid_five8_bs58::decode(&encoded32),
            data32
        );
        assert_eq!(
            super::algorithms::hybrid_five8_carry::decode(&encoded32),
            data32
        );

        assert_eq!(super::algorithms::bs58_u32::decode(&encoded64), data64);
        assert_eq!(super::algorithms::bs58_opt::decode(&encoded64), data64);
        assert_eq!(super::algorithms::bs58_port::decode(&encoded64), data64);
        assert_eq!(super::algorithms::bs58_rs::decode(&encoded64), data64);
        assert_eq!(super::algorithms::fd_fixed::decode(&encoded64), data64);
        assert_eq!(super::algorithms::five8_fixed::decode(&encoded64), data64);
        assert_eq!(
            super::algorithms::hybrid_five8_bs58::decode(&encoded64),
            data64
        );
        assert_eq!(
            super::algorithms::hybrid_five8_carry::decode(&encoded64),
            data64
        );
    }
}
