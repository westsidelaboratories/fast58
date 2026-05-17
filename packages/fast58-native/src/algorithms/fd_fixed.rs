#[inline(always)]
pub fn encode(data: &[u8]) -> String {
    match data.len() {
        32 => fd_bs58::encode_32(data),
        64 => fd_bs58::encode_64(data),
        _ => super::bs58_rs::encode(data),
    }
}

#[inline(always)]
pub fn decode(data: &str) -> Vec<u8> {
    let bytes = data.as_bytes();

    if (32..=44).contains(&bytes.len()) {
        if let Ok(out) = fd_bs58::decode_32(bytes) {
            return out.to_vec();
        }
    }

    if (64..=88).contains(&bytes.len()) {
        if let Ok(out) = fd_bs58::decode_64(bytes) {
            return out.to_vec();
        }
    }

    super::bs58_rs::decode(data)
}
