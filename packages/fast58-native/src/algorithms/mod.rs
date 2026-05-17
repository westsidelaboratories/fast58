pub mod bs58_port;
pub mod bs58_opt;
pub mod bs58_rs;
pub mod bs58_u32;
pub mod carry_iter;
pub mod carry_while;
pub mod fd_fixed;
pub mod five8_fixed;
pub mod hybrid_five8_bs58;
pub mod hybrid_five8_carry;

pub const ALPHABET: &[u8; 58] = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
pub const BASE: usize = 58;

const fn make_decode() -> [i8; 256] {
    let mut map = [-1i8; 256];
    let mut i = 0;
    while i < 58 {
        map[ALPHABET[i] as usize] = i as i8;
        i += 1;
    }
    map
}

pub const DECODE: [i8; 256] = make_decode();
