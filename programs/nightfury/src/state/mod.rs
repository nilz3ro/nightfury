use anchor_lang::prelude::*;

#[account]
pub struct NightFuryState {
    pub mint: Pubkey,
    pub day_uri: String,
    pub night_uri: String,
}
