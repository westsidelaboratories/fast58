use super::{ALPHABET, DECODE};

#[inline(always)]
pub fn encode(input: &[u8]) -> String {
    if input.is_empty() {
        return String::new();
    }

    let mut zeroes = 0usize;
    while zeroes < input.len() && input[zeroes] == 0 {
        zeroes += 1;
    }

    if zeroes == input.len() {
        return "1".repeat(zeroes);
    }

    let mut output = vec![0u8; max_encoded_len(input.len() - zeroes) + zeroes];
    let mut index = 0usize;
    let mut input_index = zeroes;

    while input_index < input.len() {
        let mut carry = input[input_index] as usize;
        let mut output_index = 0usize;

        while output_index < index {
            carry += (output[output_index] as usize) << 8;
            output[output_index] = (carry % 58) as u8;
            carry /= 58;
            output_index += 1;
        }

        while carry > 0 {
            output[index] = (carry % 58) as u8;
            index += 1;
            carry /= 58;
        }

        input_index += 1;
    }

    for _ in 0..zeroes {
        output[index] = 0;
        index += 1;
    }

    let slice = &mut output[..index];
    let mut left = 0usize;
    let mut right = slice.len().saturating_sub(1);

    while left < right {
        let left_mapped = ALPHABET[slice[left] as usize];
        let right_mapped = ALPHABET[slice[right] as usize];
        slice[left] = right_mapped;
        slice[right] = left_mapped;
        left += 1;
        right = right.saturating_sub(1);
    }

    if left == right && !slice.is_empty() {
        slice[left] = ALPHABET[slice[left] as usize];
    }

    output.truncate(index);
    unsafe { String::from_utf8_unchecked(output) }
}

#[inline(always)]
pub fn decode(input: &str) -> Vec<u8> {
    if input.is_empty() {
        return Vec::new();
    }

    let bytes = input.as_bytes();
    let mut zeroes = 0usize;
    while zeroes < bytes.len() && bytes[zeroes] == b'1' {
        zeroes += 1;
    }

    if zeroes == bytes.len() {
        return vec![0u8; zeroes];
    }

    let mut output = vec![0u8; bytes.len()];
    let mut index = 0usize;
    let mut input_index = zeroes;

    while input_index < bytes.len() {
        let byte = bytes[input_index];
        if byte > 127 {
            return Vec::new();
        }

        let carry = DECODE[byte as usize];
        if carry < 0 {
            return Vec::new();
        }

        let mut carry = carry as usize;
        let mut output_index = 0usize;
        while output_index < index {
            carry += (output[output_index] as usize) * 58;
            output[output_index] = (carry & 0xff) as u8;
            carry >>= 8;
            output_index += 1;
        }

        while carry > 0 {
            output[index] = (carry & 0xff) as u8;
            index += 1;
            carry >>= 8;
        }

        input_index += 1;
    }

    for _ in 0..zeroes {
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
