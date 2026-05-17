#[inline(always)]
pub fn encode(data: &[u8]) -> String {
    match data.len() {
        32 | 64 => super::five8_fixed::encode(data),
        _ => super::carry_iter::encode(data),
    }
}

#[inline(always)]
pub fn decode(data: &str) -> Vec<u8> {
    let bytes = data.as_bytes();

    if (32..=five8::BASE58_ENCODED_32_MAX_LEN).contains(&bytes.len()) {
        let mut out = [0u8; 32];
        if five8::decode_32(bytes, &mut out).is_ok() {
            return out.to_vec();
        }
    }

    if (64..=five8::BASE58_ENCODED_64_MAX_LEN).contains(&bytes.len()) {
        let mut out = [0u8; 64];
        if five8::decode_64(bytes, &mut out).is_ok() {
            return out.to_vec();
        }
    }

    super::carry_iter::decode(data)
}
