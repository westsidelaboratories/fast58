use super::{ALPHABET, BASE, DECODE};

#[inline(always)]
pub fn encode(data: &[u8]) -> String {
    if data.is_empty() {
        return String::new();
    }

    let zeros = data.iter().take_while(|&&byte| byte == 0).count();
    if zeros == data.len() {
        return "1".repeat(data.len());
    }

    let size = ((data.len() - zeros) * 138) / 100 + 1;
    let mut digits = vec![0u8; size];
    let mut length = 0usize;

    for &byte in &data[zeros..] {
        let mut carry = byte as usize;
        let mut index = size;
        let mut written = 0usize;

        while (carry != 0 || written < length) && index > 0 {
            index -= 1;
            carry += (digits[index] as usize) << 8;
            digits[index] = (carry % BASE) as u8;
            carry /= BASE;
            written += 1;
        }

        length = written;
    }

    let mut first = size.saturating_sub(length);
    while first < size && digits[first] == 0 {
        first += 1;
    }

    let mut result = vec![b'1'; zeros + size - first];
    for (offset, &digit) in digits[first..].iter().enumerate() {
        result[zeros + offset] = ALPHABET[digit as usize];
    }

    unsafe { String::from_utf8_unchecked(result) }
}

#[inline(always)]
pub fn decode(data: &str) -> Vec<u8> {
    if data.is_empty() {
        return Vec::new();
    }

    let bytes = data.as_bytes();
    let zeros = bytes.iter().take_while(|&&byte| byte == b'1').count();
    if zeros == bytes.len() {
        return vec![0u8; zeros];
    }

    let size = ((bytes.len() - zeros) * 733) / 1000 + 1;
    let mut decoded = vec![0u8; size];
    let mut length = 0usize;

    for &byte in &bytes[zeros..] {
        let value = DECODE[byte as usize];
        if value < 0 {
            return Vec::new();
        }

        let mut carry = value as usize;
        let mut index = size;
        let mut written = 0usize;

        while (carry != 0 || written < length) && index > 0 {
            index -= 1;
            carry += BASE * decoded[index] as usize;
            decoded[index] = (carry & 0xff) as u8;
            carry >>= 8;
            written += 1;
        }

        length = written;
    }

    let mut first = size.saturating_sub(length);
    while first < size && decoded[first] == 0 {
        first += 1;
    }

    let mut result = vec![0u8; zeros + size - first];
    for (offset, &byte) in decoded[first..].iter().enumerate() {
        result[zeros + offset] = byte;
    }
    result
}
