#[inline(always)]
pub fn encode(data: &[u8]) -> String {
    five8_dispatch_encode(data, super::bs58_rs::encode)
}

#[inline(always)]
pub fn decode(data: &str) -> Vec<u8> {
    five8_dispatch_decode(data, super::bs58_rs::decode)
}

#[inline(always)]
fn five8_dispatch_encode<F>(data: &[u8], fallback: F) -> String
where
    F: Fn(&[u8]) -> String,
{
    match data.len() {
        32 | 64 => super::five8_fixed::encode(data),
        _ => fallback(data),
    }
}

#[inline(always)]
fn five8_dispatch_decode<F>(data: &str, fallback: F) -> Vec<u8>
where
    F: Fn(&str) -> Vec<u8>,
{
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

    fallback(data)
}
