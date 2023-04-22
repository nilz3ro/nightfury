use crate::state::NightFury;
use crate::{errors::NightFuryError, state::NightFuryState};

use anchor_lang::{prelude::*, solana_program::program::invoke};
use anchor_spl::token::Mint;

use mpl_token_metadata::{
    instruction::{
        builders::UpdateBuilder, CollectionDetailsToggle, CollectionToggle, InstructionBuilder,
        RuleSetToggle, UpdateArgs, UsesToggle,
    },
    state::{Data, Metadata, TokenMetadataAccount},
    utils::assert_owned_by,
};

#[derive(Accounts)]
pub struct Switch<'info> {
    pub nightfury: Account<'info, NightFury>,
    pub mint: Account<'info, Mint>,
    /// CHECK: make sure this is a valid metadata account and that it belongs to the mint.
    pub metadata: UncheckedAccount<'info>,
    pub authority: Signer<'info>,
    /// CHECK: Make sure this is the real token metadata program.
    pub token_metadata_program: UncheckedAccount<'info>,
    /// CHECK: Make sure this is the real authorization rules program.
    pub authorization_rules_program: UncheckedAccount<'info>,
    // accounts for nft
}

pub fn process_switch(ctx: Context<Switch>) -> Result<()> {
    assert_owned_by(&ctx.accounts.metadata, &mpl_token_metadata::id())?;

    let metadata = Metadata::from_account_info(&mut ctx.accounts.metadata)?;
    let nightfury = &mut ctx.accounts.nightfury;
    let mint = &ctx.accounts.mint;

    require!(
        metadata.mint == ctx.accounts.mint.key(),
        NightFuryError::InvalidMint
    );
    require!(nightfury.mint == mint.key(), NightFuryError::InvalidMint);
    require!(
        metadata.mint.key() == mint.key(),
        NightFuryError::InvalidMint
    );
    require!(
        mint.key() == metadata.mint.key(),
        NightFuryError::InvalidMint
    );

    let update_args = UpdateArgs::V1 {
        authorization_data: None,
        new_update_authority: None,
        data: Some(Data {
            uri: match nightfury.state {
                NightFuryState::Day => nightfury.night_uri.clone(),
                NightFuryState::Night => nightfury.day_uri.clone(),
            },
            ..metadata.data
        }),
        primary_sale_happened: None,
        is_mutable: None,
        collection: CollectionToggle::None,
        uses: UsesToggle::None,
        collection_details: CollectionDetailsToggle::None,
        rule_set: RuleSetToggle::None,
    };

    let update_instruction = UpdateBuilder::new()
        .build(update_args)
        .map_err(|e| {
            msg!("{:?}", e);
            NightFuryError::FailedToBuildUpdateInstruction
        })?
        .instruction();

    invoke(
        &update_instruction,
        &[
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.authorization_rules_program.to_account_info(),
        ],
    )?;

    nightfury.state = match nightfury.state {
        NightFuryState::Day => NightFuryState::Night,
        NightFuryState::Night => NightFuryState::Day,
    };

    Ok(())
}
