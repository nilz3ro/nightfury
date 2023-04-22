use anchor_lang::prelude::*;

#[account]
pub struct NightFury {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub day_uri: String,
    pub night_uri: String,
    pub state: NightFuryState,
}

impl NightFury {
    pub const MAX_URI_LENGTH: u16 = 256;
    pub const LENGTH: usize = 8 + 32 + 256 + 256 + 3;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum NightFuryState {
    Day,
    Night,
}
