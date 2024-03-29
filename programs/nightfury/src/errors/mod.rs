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
    #[msg("Invalid Instructions Sysvar Id")]
    InvalidInstructionsSysvarId,
    #[msg("Invalid Token Metadata Program")]
    InvalidTokenMetadataProgram,
    #[msg("Invalid Edition Account")]
    InvalidEditionAccount,
    #[msg("Invalid Metadata Account")]
    InvalidMetadataAccount,
    #[msg("Invalid Auth Rules Program")]
    InvalidAuthRulesProgram,
    #[msg("Invalid Delegate Instruction")]
    InvalidDelegateInstruction,
}
