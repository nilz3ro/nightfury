use crate::state::NightFury;
use crate::{errors::NightFuryError, state::NightFuryState};

use anchor_lang::{
    prelude::*, solana_program::program::invoke, solana_program::sysvar::instructions,
};
use anchor_spl::token::{Mint, Token, TokenAccount};

use clockwork_sdk::state::Thread;
use mpl_token_metadata::{
    instruction::{
        builders::UpdateBuilder, CollectionDetailsToggle, CollectionToggle, InstructionBuilder,
        RuleSetToggle, UpdateArgs,
    },
    state::{Data, Metadata, TokenMetadataAccount},
    utils::assert_owned_by,
};

#[derive(Accounts)]
pub struct Switch<'info> {
    #[account(
        mut,
        seeds = [
            b"nightfury".as_ref(),
            mint.key().as_ref(),
            nightfury.authority.key().as_ref()
        ],
        bump
    )]
    pub nightfury: Box<Account<'info, NightFury>>,
    // pub token: Account<'info, TokenAccount>,
    pub mint: Box<Account<'info, Mint>>,
    /// CHECK: make sure this is a valid metadata account and that it belongs to the mint.
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    // pub token_account: Box<Account<'info, TokenAccount>>,
    /// CHECK: make sure the master edition account matches the mint and metadata accounts.
    pub master_edition: UncheckedAccount<'info>,
    /// CHECK: Make sure it's the correct delegate record.
    pub delegate_record: UncheckedAccount<'info>,
    /// CHECK: make sure it's a valid thread
    #[account(mut)]
    pub thread: Signer<'info>,
    /// CHECK: Make sure this account belongs to the auth rules program
    pub auth_rules: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    /// CHECK: Make sure this is the real token metadata program.
    pub token_metadata_program: UncheckedAccount<'info>,
    /// CHECK: Manually check this against the sysvar instruction program id
    pub instructions_sysvar: UncheckedAccount<'info>,
    /// CHECK: Make sure this is the real authorization rules program.
    pub authorization_rules_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
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
    require!(
        instructions::check_id(&ctx.accounts.instructions_sysvar.key()),
        NightFuryError::InvalidInstructionsSysvarId
    );

    let update_args = UpdateArgs::AsDataItemDelegateV2 {
        data: Some(Data {
            uri: match nightfury.state {
                NightFuryState::Day => nightfury.night_uri.clone(),
                NightFuryState::Night => nightfury.day_uri.clone(),
            },
            ..metadata.data
        }),
        authorization_data: None,
    };

    let update_instruction = UpdateBuilder::new()
        .payer(ctx.accounts.thread.key())
        .authority(ctx.accounts.thread.key())
        .mint(ctx.accounts.mint.key())
        // .token(ctx.accounts.token_account.key())
        .metadata(ctx.accounts.metadata.key())
        .edition(ctx.accounts.master_edition.key())
        .authorization_rules(ctx.accounts.auth_rules.key())
        .delegate_record(ctx.accounts.delegate_record.key())
        .authorization_rules_program(ctx.accounts.authorization_rules_program.key())
        .build(update_args)
        .map_err(|e| {
            msg!("{:?}", e);
            NightFuryError::FailedToBuildUpdateInstruction
        })?
        .instruction();

    msg!("invoking update instruction");
    invoke(
        &update_instruction,
        &[
            ctx.accounts.thread.to_account_info(),
            ctx.accounts.delegate_record.to_account_info(),
            // ctx.accounts.token_account.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.thread.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.instructions_sysvar.to_account_info(),
            ctx.accounts.authorization_rules_program.to_account_info(),
            ctx.accounts.auth_rules.to_account_info(),
        ],
    )?;

    nightfury.state = match nightfury.state {
        NightFuryState::Day => NightFuryState::Night,
        NightFuryState::Night => NightFuryState::Day,
    };

    Ok(())
}
