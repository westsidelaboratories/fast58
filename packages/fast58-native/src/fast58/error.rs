use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Fast58Error;

impl fmt::Display for Fast58Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("Non-base58 character")
    }
}

impl std::error::Error for Fast58Error {}
