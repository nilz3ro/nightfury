use anchor_lang::prelude::*;

#[account]
pub struct NightFury {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub day_uri: String,
    pub night_uri: String,
    pub state: NightFuryState,
    pub thread: Pubkey,
    pub thread_id: Vec<u8>,
    pub bump: u8,
}

impl NightFury {
    pub const MAX_URI_LENGTH: u16 = 256;
    pub const LENGTH: usize = 8 + 32 + 256 + 256 + 3 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum NightFuryState {
    Day,
    Night,
}
