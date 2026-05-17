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
        let mut carry = input[input_index] as u32;
        let mut output_index = 0usize;

        while output_index < index {
            unsafe {
                carry += (*output.get_unchecked(output_index) as u32) << 8;
                *output.get_unchecked_mut(output_index) = (carry % 58) as u8;
            }
            carry /= 58;
            output_index += 1;
        }

        while carry > 0 {
            unsafe {
                *output.get_unchecked_mut(index) = (carry % 58) as u8;
            }
            index += 1;
            carry /= 58;
        }

        input_index += 1;
    }

    let mut zeros_written = 0usize;
    while zeros_written < zeroes {
        unsafe {
            *output.get_unchecked_mut(index) = 0;
        }
        index += 1;
        zeros_written += 1;
    }

    let slice = &mut output[..index];
    let mut i = 0usize;
    while i < slice.len() {
        unsafe {
            *slice.get_unchecked_mut(i) = ALPHABET[*slice.get_unchecked(i) as usize];
        }
        i += 1;
    }
    slice.reverse();

    output.truncate(index);
    unsafe { String::from_utf8_unchecked(output) }
}

#[inline(always)]
pub fn decode(input: &str) -> Vec<u8> {
    if input.is_empty() {
        return Vec::new();
    }

    let bytes = input.as_bytes();
    let mut output = vec![0u8; bytes.len()];
    let mut index = 0usize;
    let mut input_index = 0usize;

    while input_index < bytes.len() {
        let byte = unsafe { *bytes.get_unchecked(input_index) };
        if byte > 127 {
            return Vec::new();
        }

        let carry = unsafe { *DECODE.get_unchecked(byte as usize) };
        if carry < 0 {
            return Vec::new();
        }

        let mut carry = carry as u32;
        let mut output_index = 0usize;
        while output_index < index {
            unsafe {
                carry += (*output.get_unchecked(output_index) as u32) * 58;
                *output.get_unchecked_mut(output_index) = (carry & 0xff) as u8;
            }
            carry >>= 8;
            output_index += 1;
        }

        while carry > 0 {
            unsafe {
                *output.get_unchecked_mut(index) = (carry & 0xff) as u8;
            }
            index += 1;
            carry >>= 8;
        }

        input_index += 1;
    }

    let mut zeroes = 0usize;
    while zeroes < bytes.len() && unsafe { *bytes.get_unchecked(zeroes) } == b'1' {
        unsafe {
            *output.get_unchecked_mut(index) = 0;
        }
        index += 1;
        zeroes += 1;
    }

    output[..index].reverse();
    output.truncate(index);
    output
}

#[inline(always)]
const fn max_encoded_len(len: usize) -> usize {
    len + (len + 1) / 2
}
