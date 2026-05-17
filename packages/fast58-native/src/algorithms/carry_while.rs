use super::{ALPHABET, BASE, DECODE};

#[inline(always)]
pub fn encode(data: &[u8]) -> String {
    if data.is_empty() {
        return String::new();
    }

    let mut zeros = 0usize;
    while zeros < data.len() && data[zeros] == 0 {
        zeros += 1;
    }

    if zeros == data.len() {
        return "1".repeat(zeros);
    }

    let size = ((data.len() - zeros) * 138) / 100 + 1;
    let mut digits = vec![0u8; size];
    let mut length = 0usize;
    let mut input_index = zeros;

    while input_index < data.len() {
        let mut carry = data[input_index] as usize;
        let mut output_index = size;
        let mut written = 0usize;

        while (carry != 0 || written < length) && output_index > 0 {
            output_index -= 1;
            carry += (digits[output_index] as usize) << 8;
            digits[output_index] = (carry % BASE) as u8;
            carry /= BASE;
            written += 1;
        }

        length = written;
        input_index += 1;
    }

    let mut first = size.saturating_sub(length);
    while first < size && digits[first] == 0 {
        first += 1;
    }

    let mut result = vec![b'1'; zeros + size - first];
    let mut source_index = first;
    let mut target_index = zeros;
    while source_index < size {
        result[target_index] = ALPHABET[digits[source_index] as usize];
        source_index += 1;
        target_index += 1;
    }

    unsafe { String::from_utf8_unchecked(result) }
}

#[inline(always)]
pub fn decode(data: &str) -> Vec<u8> {
    if data.is_empty() {
        return Vec::new();
    }

    let bytes = data.as_bytes();
    let mut zeros = 0usize;
    while zeros < bytes.len() && bytes[zeros] == b'1' {
        zeros += 1;
    }

    if zeros == bytes.len() {
        return vec![0u8; zeros];
    }

    let size = ((bytes.len() - zeros) * 733) / 1000 + 1;
    let mut decoded = vec![0u8; size];
    let mut length = 0usize;
    let mut input_index = zeros;

    while input_index < bytes.len() {
        let value = DECODE[bytes[input_index] as usize];
        if value < 0 {
            return Vec::new();
        }

        let mut carry = value as usize;
        let mut output_index = size;
        let mut written = 0usize;

        while (carry != 0 || written < length) && output_index > 0 {
            output_index -= 1;
            carry += BASE * decoded[output_index] as usize;
            decoded[output_index] = (carry & 0xff) as u8;
            carry >>= 8;
            written += 1;
        }

        length = written;
        input_index += 1;
    }

    let mut first = size.saturating_sub(length);
    while first < size && decoded[first] == 0 {
        first += 1;
    }

    let mut result = vec![0u8; zeros + size - first];
    let mut source_index = first;
    let mut target_index = zeros;
    while source_index < size {
        result[target_index] = decoded[source_index];
        source_index += 1;
        target_index += 1;
    }
    result
}
