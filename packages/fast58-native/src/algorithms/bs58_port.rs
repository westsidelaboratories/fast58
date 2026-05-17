use super::{ALPHABET, DECODE};

#[inline(always)]
pub fn encode(input: &[u8]) -> String {
    if input.is_empty() {
        return String::new();
    }

    let mut output = vec![0u8; max_encoded_len(input.len())];
    let mut index = 0usize;

    for &value in input {
        let mut carry = value as usize;

        for byte in &mut output[..index] {
            carry += (*byte as usize) << 8;
            *byte = (carry % 58) as u8;
            carry /= 58;
        }

        while carry > 0 {
            output[index] = (carry % 58) as u8;
            index += 1;
            carry /= 58;
        }
    }

    for _ in input.iter().take_while(|byte| **byte == 0) {
        output[index] = 0;
        index += 1;
    }

    let mut encoded = vec![0u8; index];
    for i in 0..index {
        encoded[i] = ALPHABET[output[index - 1 - i] as usize];
    }

    unsafe { String::from_utf8_unchecked(encoded) }
}

#[inline(always)]
pub fn decode(input: &str) -> Vec<u8> {
    if input.is_empty() {
        return Vec::new();
    }

    let bytes = input.as_bytes();
    let mut output = vec![0u8; bytes.len()];
    let mut index = 0usize;

    for &byte in bytes {
        if byte > 127 {
            return Vec::new();
        }

        let value = DECODE[byte as usize];
        if value < 0 {
            return Vec::new();
        }

        let mut carry = value as usize;
        for out in &mut output[..index] {
            carry += (*out as usize) * 58;
            *out = (carry & 0xff) as u8;
            carry >>= 8;
        }

        while carry > 0 {
            if index == output.len() {
                return Vec::new();
            }

            output[index] = (carry & 0xff) as u8;
            index += 1;
            carry >>= 8;
        }
    }

    for _ in bytes.iter().take_while(|byte| **byte == b'1') {
        if index == output.len() {
            return Vec::new();
        }

        output[index] = 0;
        index += 1;
    }

    output[..index].reverse();
    output.truncate(index);
    output
}

#[inline(always)]
const fn max_encoded_len(len: usize) -> usize {
    len + (len + 1) / 2
}
