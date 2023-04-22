use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use mpl_token_metadata::{
    state::{Metadata, TokenMetadataAccount},
    // utils::assert_data_valid,
    utils::assert_owned_by,
};

use crate::state::NightFuryState;

#[derive(Accounts)]
pub struct Initialize<'info> {
    pub nightfury: Account<'info, NightFuryState>,
    pub mint: Account<'info, Mint>,
    /// CHECK: make sure this is a valid metadata account and that it belongs to the mint.
    pub metadata: UncheckedAccount<'info>,
    pub authority: Signer<'info>, // accounts for nft
}

pub fn process_initialize(
    ctx: Context<Initialize>,
    day_uri: String,
    night_uri: String,
) -> Result<()> {
    let nightfury = &mut ctx.accounts.nightfury;

    assert_owned_by(&ctx.accounts.metadata, &mpl_token_metadata::id())?;

    let metadata = Metadata::from_account_info(&mut ctx.accounts.metadata)?;

    nightfury.mint = ctx.accounts.mint.key();
    nightfury.day_uri = day_uri;
    nightfury.night_uri = night_uri;

    // set day_uri
    // set night_uri
    // schedule go_night

    Ok(())
}
