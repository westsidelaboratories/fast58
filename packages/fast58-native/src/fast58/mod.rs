mod dispatch;
mod error;

pub use dispatch::{decode, encode};
pub use error::Fast58Error;

/// Decode and return `None` when the input contains a non-Base58 character.
#[inline]
pub fn decode_opt(data: &str) -> Option<Vec<u8>> {
    let bytes = data.as_bytes();
    if bytes.is_empty() {
        return Some(Vec::new());
    }

    if (32..=five8::BASE58_ENCODED_32_MAX_LEN).contains(&bytes.len()) {
        let mut out = [0u8; 32];
        if five8::decode_32(bytes, &mut out).is_ok() {
            return Some(out.to_vec());
        }
    }

    if (64..=five8::BASE58_ENCODED_64_MAX_LEN).contains(&bytes.len()) {
        let mut out = [0u8; 64];
        if five8::decode_64(bytes, &mut out).is_ok() {
            return Some(out.to_vec());
        }
    }

    bs58::decode(data).into_vec().ok()
}

/// Decode and throw on invalid input (matches `fast58-js` / `bs58` strict mode).
#[inline]
pub fn decode_strict(data: &str) -> Result<Vec<u8>, Fast58Error> {
    decode_opt(data).ok_or(Fast58Error)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_vector() {
        assert_eq!(encode(b"hello"), "Cn8eVZg");
        assert_eq!(decode("Cn8eVZg"), b"hello");
    }

    #[test]
    fn roundtrip_sizes() {
        for len in [0usize, 1, 2, 4, 8, 16, 32, 64, 128, 256] {
            let mut data = vec![0u8; len];
            for (i, byte) in data.iter_mut().enumerate() {
                *byte = ((i * 17 + 3) & 0xff) as u8;
            }
            if len > 0 {
                data[0] = 1;
            }
            let encoded = bs58::encode(&data).into_string();
            assert_eq!(encode(&data), encoded, "encode mismatch len={len}");
            assert_eq!(decode(&encoded), data, "decode mismatch len={len}");
        }
    }

    #[test]
    fn decode_opt_invalid() {
        assert!(decode_opt("0").is_none());
        assert!(decode_strict("0").is_err());
    }
}
