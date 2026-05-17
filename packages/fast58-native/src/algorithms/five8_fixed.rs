#[inline(always)]
pub fn encode(data: &[u8]) -> String {
    match data.len() {
        32 => {
            let mut out = [0u8; five8::BASE58_ENCODED_32_MAX_LEN];
            let len = five8::encode_32(data.try_into().unwrap(), &mut out) as usize;
            unsafe { String::from_utf8_unchecked(out[..len].to_vec()) }
        }
        64 => {
            let mut out = [0u8; five8::BASE58_ENCODED_64_MAX_LEN];
            let len = five8::encode_64(data.try_into().unwrap(), &mut out) as usize;
            unsafe { String::from_utf8_unchecked(out[..len].to_vec()) }
        }
        _ => super::bs58_rs::encode(data),
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

    super::bs58_rs::decode(data)
}
