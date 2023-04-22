use crate::{errors::NightFuryError, state::NightFuryState};
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use mpl_token_metadata::{
    state::{Metadata, TokenMetadataAccount},
    // utils::assert_data_valid,
    utils::assert_owned_by,
};

use crate::state::NightFury;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        space = NightFury::LENGTH,
        payer = authority,
        seeds = [
            b"nightfury".as_ref(),
            mint.key().as_ref(),
            authority.key().as_ref()
        ],
        bump
    )]
    pub nightfury: Account<'info, NightFury>,
    pub mint: Account<'info, Mint>,
    /// CHECK: make sure this is a valid metadata account and that it belongs to the mint.
    pub metadata: UncheckedAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>, // accounts for nft
    pub system_program: Program<'info, System>,
}

pub fn process_initialize(
    ctx: Context<Initialize>,
    day_uri: String,
    night_uri: String,
) -> Result<()> {
    assert_owned_by(&ctx.accounts.metadata, &mpl_token_metadata::id())?;
    let metadata = Metadata::from_account_info(&mut ctx.accounts.metadata)?;

    require!(
        metadata.mint == ctx.accounts.mint.key(),
        NightFuryError::InvalidMint
    );
    require!(
        day_uri.len() <= NightFury::MAX_URI_LENGTH.into(),
        NightFuryError::UriTooLong
    );
    require!(
        night_uri.len() <= NightFury::MAX_URI_LENGTH.into(),
        NightFuryError::UriTooLong
    );

    let nightfury = &mut ctx.accounts.nightfury;

    nightfury.authority = ctx.accounts.authority.key();
    nightfury.mint = ctx.accounts.mint.key();
    nightfury.day_uri = day_uri;
    nightfury.night_uri = night_uri;
    nightfury.state = NightFuryState::Day;

    // set up clockwork thread
    Ok(())
}
