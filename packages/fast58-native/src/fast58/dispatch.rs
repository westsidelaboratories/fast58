use fd_bs58;
use five8;

use crate::algorithms::{bs58_port, bs58_rs, bs58_u32, fd_fixed};

/// Production encode: `fd_bs58` on 32/64B Solana paths, `bs58_u32` elsewhere.
#[inline]
pub fn encode(data: &[u8]) -> String {
    match data.len() {
        32 | 64 => fd_fixed::encode(data),
        _ => bs58_u32::encode(data),
    }
}

/// Production decode: `five8`/`fd_bs58` fast paths by encoded length, `bs58_port` for long strings.
#[inline]
pub fn decode(data: &str) -> Vec<u8> {
    let bytes = data.as_bytes();

    if (32..=five8::BASE58_ENCODED_32_MAX_LEN).contains(&bytes.len()) {
        if let Ok(out) = fd_bs58::decode_32(bytes) {
            return out.to_vec();
        }
    }

    if (64..=five8::BASE58_ENCODED_64_MAX_LEN).contains(&bytes.len()) {
        if let Ok(out) = fd_bs58::decode_64(bytes) {
            return out.to_vec();
        }
    }

    if bytes.len() >= 64 {
        return bs58_port::decode(data);
    }

    bs58_rs::decode(data)
}
