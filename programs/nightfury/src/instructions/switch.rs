use crate::errors::NightFuryError;
use crate::state::NightFuryState;

use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

#[derive(Accounts)]
pub struct Switch<'info> {
    pub nightfury: Account<'info, NightFuryState>,
    pub mint: Account<'info, Mint>,
    /// CHECK: make sure this is a valid metadata account and that it belongs to the mint.
    pub metadata: UncheckedAccount<'info>,
    pub authority: Signer<'info>,
    // accounts for nft
}

pub fn process_switch(ctx: Context<Switch>) -> Result<()> {
    let nightfury = &ctx.accounts.nightfury;
    let mint = &ctx.accounts.mint;

    require!(nightfury.mint == mint.key(), NightFuryError::InvalidMint);
    Ok(())
}
