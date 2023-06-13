use anchor_lang::{prelude::*, solana_program::program::invoke};
use anchor_spl::token::{Mint, Token};
use clockwork_sdk::{
    cpi::{thread_delete, ThreadDelete},
    state::{Thread, ThreadAccount},
    ThreadProgram,
};
use mpl_token_metadata::instruction::builders::RevokeBuilder;
use mpl_token_metadata::instruction::InstructionBuilder;
use mpl_token_metadata::instruction::RevokeArgs;

use crate::state::NightFury;

#[derive(Accounts)]
pub struct Revoke<'info> {
    pub authority: Signer<'info>,
    #[account(mut, has_one = thread, has_one = mint, has_one = authority)]
    pub nightfury: Account<'info, NightFury>,
    #[account(mut, address = thread.pubkey(), constraint = thread.authority.eq(&nightfury.key()))]
    pub thread: Account<'info, Thread>,

    pub mint: Box<Account<'info, Mint>>,
    /// CHECK: make sure this is a valid metadata account and that it belongs to the mint.
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: manually check this edition account matches the metadata and mint.
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    /// CHECK: assert derivation and owner of this account.
    #[account(mut)]
    pub delegate_record: UncheckedAccount<'info>,
    /// CHECK: Make sure it's the authorization_rules_program
    pub authorization_rules: UncheckedAccount<'info>,
    /// CHECK: Make sure it's the real instructions sysvar.
    pub instructions_sysvar: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    /// CHECK: Make sure this is the real token metadata program.
    pub token_metadata_program: UncheckedAccount<'info>,
    /// CHECK: Make sure this is the real authorization rules program.
    pub authorization_rules_program: UncheckedAccount<'info>,
    pub thread_program: Program<'info, ThreadProgram>,
    pub system_program: Program<'info, System>,
}

// /// Revokes a delegate.
// ///
// /// A delegate can revoke itself by signing the transaction as the 'approver'.
// #[account(0, optional, writable, name="delegate_record", desc="Delegate record account")]
// #[account(1, name="delegate", desc="Owner of the delegated account")]
// #[account(2, writable, name="metadata", desc="Metadata account")]
// #[account(3, optional, name="master_edition", desc="Master Edition account")]
// #[account(4, optional, writable, name="token_record", desc="Token record account")]
// #[account(5, name="mint", desc="Mint of metadata")]
// #[account(6, optional, writable, name="token", desc="Token account of mint")]
// #[account(7, signer, name="authority", desc="Update authority or token owner")]
// #[account(8, signer, writable, name="payer", desc="Payer")]
// #[account(9, name="system_program", desc="System Program")]
// #[account(10, name="sysvar_instructions", desc="Instructions sysvar account")]
// #[account(11, optional, name="spl_token_program", desc="SPL Token Program")]
// #[account(12, optional, name="authorization_rules_program", desc="Token Authorization Rules Program")]
// #[account(13, optional, name="authorization_rules", desc="Token Authorization Rules account")]
// #[default_optional_accounts]
// Revoke(RevokeArgs),

pub fn process_revoke(ctx: Context<Revoke>) -> Result<()> {
    // Terminates the automation.
    // This instruction should clean up any delegations placed on NFTs.
    // Delegate metadata update authorization to nightfury account.
    let nightfury = &ctx.accounts.nightfury;

    // Revoke the metaplex update authority.
    let revoke_args = RevokeArgs::DataItemV1 {};
    let revoke_instruction = RevokeBuilder::new()
        .delegate_record(ctx.accounts.delegate_record.key())
        .delegate(ctx.accounts.thread.key())
        .metadata(ctx.accounts.metadata.key())
        .master_edition(ctx.accounts.master_edition.key())
        .mint(ctx.accounts.mint.key())
        .authority(ctx.accounts.authority.key())
        .payer(ctx.accounts.authority.key())
        .system_program(ctx.accounts.system_program.key())
        .sysvar_instructions(ctx.accounts.instructions_sysvar.key())
        .spl_token_program(ctx.accounts.token_program.key())
        .authorization_rules_program(ctx.accounts.authorization_rules_program.key())
        .authorization_rules(ctx.accounts.authorization_rules.key())
        .build(revoke_args)
        .unwrap()
        .instruction();
    let revoke_account_infos = vec![
        ctx.accounts.delegate_record.to_account_info(),
        ctx.accounts.thread.to_account_info(),
        ctx.accounts.metadata.to_account_info(),
        ctx.accounts.master_edition.to_account_info(),
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.instructions_sysvar.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.authorization_rules_program.to_account_info(),
        ctx.accounts.authorization_rules.to_account_info(),
    ];
    invoke(&revoke_instruction, revoke_account_infos.as_slice())?;

    // Delete the thread.
    thread_delete(CpiContext::new_with_signer(
        ctx.accounts.thread_program.to_account_info(),
        ThreadDelete {
            authority: ctx.accounts.nightfury.to_account_info(),
            close_to: ctx.accounts.authority.to_account_info(),
            thread: ctx.accounts.thread.to_account_info(),
        },
        &[&[
            b"nightfury".as_ref(),
            ctx.accounts.mint.key().as_ref(),
            ctx.accounts.authority.key().as_ref(),
            ctx.accounts.nightfury.thread_id.as_ref(),
            &[nightfury.bump],
        ]],
    ))?;

    Ok(())
}
