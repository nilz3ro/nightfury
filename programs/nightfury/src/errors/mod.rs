use anchor_lang::prelude::*;

#[error_code]
pub enum NightFuryError {
    #[msg("Invalid NightFury Authority")]
    InvalidAuthority,
    #[msg("Invalid NightFury Mint")]
    InvalidMint,
    #[msg("Uri too long")]
    UriTooLong,
    FailedToBuildUpdateInstruction,
}
