use std::time::Instant;

use fast58::algorithms::{bs58_rs, bs58_u32, fd_fixed, hybrid_five8_bs58};
use fast58::{decode, encode};

fn make_vector(size: usize, seed: u32) -> Vec<u8> {
    let mut bytes = vec![0u8; size];
    let mut state = seed as i32;

    for byte in &mut bytes {
        state ^= state << 13;
        state ^= state >> 17;
        state ^= state << 5;
        state &= 0xff;
        *byte = state as u8;
    }

    bytes
}

fn bench<F: Fn()>(f: F, target_ms: u128) -> f64 {
    f();

    let mut iterations = 1u64;
    loop {
        let start = Instant::now();
        for _ in 0..iterations {
            f();
        }
        let elapsed = start.elapsed().as_secs_f64() * 1000.0;

        if elapsed >= target_ms as f64 {
            return iterations as f64 / (elapsed / 1000.0);
        }

        let scaled = ((iterations as f64 * target_ms as f64) / elapsed.max(0.1)).ceil() as u64;
        iterations = iterations.max(2).max(scaled);
    }
}

struct Candidate {
    name: &'static str,
    encode: fn(&[u8]) -> String,
    decode: fn(&str) -> Vec<u8>,
}

fn main() {
    let candidates = [
        Candidate {
            name: "fast58",
            encode,
            decode,
        },
        Candidate {
            name: "hybrid-five8-bs58",
            encode: hybrid_five8_bs58::encode,
            decode: hybrid_five8_bs58::decode,
        },
        Candidate {
            name: "fd-fixed",
            encode: fd_fixed::encode,
            decode: fd_fixed::decode,
        },
        Candidate {
            name: "bs58-u32",
            encode: bs58_u32::encode,
            decode: bs58_u32::decode,
        },
        Candidate {
            name: "bs58-rs",
            encode: bs58_rs::encode,
            decode: bs58_rs::decode,
        },
        Candidate {
            name: "bs58-crate",
            encode: |d| bs58::encode(d).into_string(),
            decode: |s| bs58::decode(s).into_vec().unwrap_or_default(),
        },
    ];

    let sizes = [0usize, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
    let gmean_sizes = [1usize, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

    println!("fast58 Rust microbench (release build recommended)\n");

    for &size in &sizes {
        let data = make_vector(size, (size as u32) * 17 + 3);
        let encoded = bs58::encode(&data).into_string();

        let mut best_enc = ("", 0.0);
        let mut best_dec = ("", 0.0);

        for candidate in &candidates {
            let enc_ops = bench(|| {
                std::hint::black_box((candidate.encode)(&data));
            }, 80);
            let dec_ops = bench(|| {
                std::hint::black_box((candidate.decode)(&encoded));
            }, 80);

            if enc_ops > best_enc.1 {
                best_enc = (candidate.name, enc_ops);
            }
            if dec_ops > best_dec.1 {
                best_dec = (candidate.name, dec_ops);
            }
        }

        println!(
            "{:4}B  enc {:<18} {:>12.0}/s  dec {:<18} {:>12.0}/s",
            size,
            best_enc.0,
            best_enc.1,
            best_dec.0,
            best_dec.1,
        );
    }

    println!("\nfast58 vs bs58-crate gmean (encode+decode combined):");
    let mut fast58_scores = Vec::new();
    let mut bs58_scores = Vec::new();

    for &size in &gmean_sizes {
        let data = make_vector(size, (size as u32) * 17 + 3);
        let encoded = bs58::encode(&data).into_string();

        let f_enc = bench(|| {
            std::hint::black_box(encode(&data));
        }, 60);
        let f_dec = bench(|| {
            std::hint::black_box(decode(&encoded));
        }, 60);
        let b_enc = bench(|| {
            std::hint::black_box(bs58::encode(&data).into_string());
        }, 60);
        let b_dec = bench(|| {
            std::hint::black_box(bs58::decode(&encoded).into_vec().unwrap());
        }, 60);

        fast58_scores.push((f_enc * f_dec).sqrt());
        bs58_scores.push((b_enc * b_dec).sqrt());
    }

    let gmean = |vals: &[f64]| vals.iter().map(|v| v.ln()).sum::<f64>().exp() / vals.len() as f64;
    let f = gmean(&fast58_scores);
    let b = gmean(&bs58_scores);
    println!("  fast58     {:.0}/s", f);
    println!("  bs58       {:.0}/s", b);
    println!("  ratio      {:.2}x", f / b);
}
