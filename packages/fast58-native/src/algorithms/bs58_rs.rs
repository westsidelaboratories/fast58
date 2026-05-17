#[inline(always)]
pub fn encode(data: &[u8]) -> String {
    bs58::encode(data).into_string()
}

#[inline(always)]
pub fn decode(data: &str) -> Vec<u8> {
    bs58::decode(data).into_vec().unwrap_or_default()
}
