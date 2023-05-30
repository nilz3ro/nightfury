use crate::{errors::NightFuryError, state::NightFuryState};
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::InstructionData;
use anchor_lang::{prelude::*, solana_program::native_token::LAMPORTS_PER_SOL};
use anchor_spl::{
    token::Mint,
    token::{Token, TokenAccount},
};
use clockwork_sdk::{state::Thread, ThreadProgram};
use mpl_token_metadata::instruction::builders::DelegateBuilder;
use mpl_token_metadata::instruction::DelegateArgs;
use mpl_token_metadata::instruction::InstructionBuilder;
use mpl_token_metadata::pda::find_metadata_delegate_record_account;
use mpl_token_metadata::processor::AuthorizationData;
use mpl_token_metadata::state::MasterEditionV2;
use mpl_token_metadata::{
    instruction::MetadataDelegateRole,
    state::{Metadata, TokenMetadataAccount},
    utils::assert_owned_by,
};

use crate::state::NightFury;

#[derive(Accounts)]
#[instruction(thread_id: Vec <u8>)]
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
    pub nightfury: Box<Account<'info, NightFury>>,
    pub mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub token_account: Box<Account<'info, TokenAccount>>,
    /// CHECK: make sure this is a valid metadata account and that it belongs to the mint.
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: manually check this edition account matches the metadata and mint.
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: assert derivation and owner of this account.
    #[account(mut)]
    pub delegate_record: UncheckedAccount<'info>,
    /// CHECK: make sure it's a valid thread
    #[account(mut, address = Thread::pubkey(thread_authority.key(), thread_id))]
    pub thread: UncheckedAccount<'info>,
    /// CHECK: Make sure this is the real instructions sysvar.
    #[account(
       init,
       space = NightFury::LENGTH,
       payer = authority,
        seeds = [
        b"thread_authority".as_ref(),
        nightfury.key().as_ref(),
    ], bump)]
    pub thread_authority: Box<Account<'info, NightFury>>,
    /// CHECK: Make sure it's the authorization_rules_program
    pub authorization_rules: UncheckedAccount<'info>,
    /// CHECK: Make sure it's the real instructions sysvar.
    pub instructions_sysvar: UncheckedAccount<'info>,
    pub thread_program: Program<'info, ThreadProgram>,
    pub token_program: Program<'info, Token>,
    /// CHECK: Make sure this is the real token metadata program.
    pub token_metadata_program: UncheckedAccount<'info>,
    /// CHECK: Make sure this is the real authorization rules program.
    pub authorization_rules_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn process_initialize(
    ctx: Context<Initialize>,
    thread_id: Vec<u8>,
    day_uri: String,
    night_uri: String,
) -> Result<()> {
    msg!("Initializing NightFury");

    assert_owned_by(
        &ctx.accounts.authorization_rules,
        &mpl_token_auth_rules::id(),
    )?;
    require!(
        &ctx.accounts.authorization_rules_program.key() == &mpl_token_auth_rules::ID,
        NightFuryError::InvalidAuthRulesProgram
    );

    assert_owned_by(&ctx.accounts.metadata, &mpl_token_metadata::id())?;
    let metadata = Metadata::from_account_info(&mut ctx.accounts.metadata)?;

    assert_owned_by(&ctx.accounts.master_edition, &mpl_token_metadata::id())?;
    MasterEditionV2::from_account_info(&ctx.accounts.master_edition).map_err(|_| {
        msg!("Not master edition v2");
        NightFuryError::InvalidEditionAccount
    })?;

    require!(
        &ctx.accounts.token_metadata_program.key() == &mpl_token_metadata::id(),
        NightFuryError::InvalidTokenMetadataProgram
    );
    require!(
        metadata.mint == ctx.accounts.mint.key(),
        NightFuryError::InvalidMint
    );
    require!(
        ctx.accounts.mint.key() == ctx.accounts.token_account.mint,
        NightFuryError::InvalidMint,
    );
    require!(
        day_uri.len() <= NightFury::MAX_URI_LENGTH.into(),
        NightFuryError::UriTooLong
    );
    require!(
        night_uri.len() <= NightFury::MAX_URI_LENGTH.into(),
        NightFuryError::UriTooLong
    );

    let authority = &ctx.accounts.authority;
    let mint = &ctx.accounts.mint;
    let metadata_account = &ctx.accounts.metadata;
    // let master_edition = &ctx.accounts.master_edition;
    let thread = &ctx.accounts.thread.key();
    let thread_program = &ctx.accounts.thread_program;
    let token_program = &ctx.accounts.token_program;
    let token_metadata_program = &ctx.accounts.token_metadata_program;
    // let instructions_sysvar = &ctx.accounts.instructions_sysvar;
    let system_program = &ctx.accounts.system_program;
    // let nightfury = &ctx.accounts.nightfury;

    let (delegate_record_address, _) = find_metadata_delegate_record_account(
        &mint.key(),
        MetadataDelegateRole::DataItem,
        &authority.key(),
        &thread.key(),
    );

    msg!(
        "role to string: {}",
        MetadataDelegateRole::DataItem.to_string()
    );

    let delegate_args = DelegateArgs::DataItemV1 {
        authorization_data: None,
    };
    let delegate_instruction = DelegateBuilder::new()
        .delegate(thread.key())
        .metadata(metadata_account.key())
        .master_edition(ctx.accounts.master_edition.key())
        .authority(authority.key())
        .payer(ctx.accounts.authority.key())
        .mint(ctx.accounts.mint.key())
        .token(ctx.accounts.token_account.key())
        .spl_token_program(token_program.key())
        .delegate_record(delegate_record_address)
        .authorization_rules(ctx.accounts.authorization_rules.key())
        .authorization_rules_program(mpl_token_auth_rules::ID)
        .system_program(ctx.accounts.system_program.key())
        .build(delegate_args)
        .unwrap()
        .instruction();

    msg!("delegate_record_address: {}", delegate_record_address);
    msg!("thread: {}", ctx.accounts.thread.key());
    msg!("metadata: {}", ctx.accounts.metadata.key());
    msg!("master_edition: {}", ctx.accounts.master_edition.key());
    msg!("mint: {}", ctx.accounts.mint.key());
    msg!("token_account: {}", ctx.accounts.token_account.key());
    msg!("authority: {}", ctx.accounts.authority.key());
    msg!("system_program: {}", ctx.accounts.system_program.key());
    msg!("token_program: {}", ctx.accounts.token_program.key());
    msg!("authorization_rules_program: {}", mpl_token_auth_rules::ID);
    msg!(
        "authorization_rules: {}",
        ctx.accounts.authorization_rules.key()
    );

    let delegate_account_infos = vec![
        ctx.accounts.delegate_record.to_account_info(),
        ctx.accounts.thread.to_account_info(),
        ctx.accounts.metadata.to_account_info(),
        ctx.accounts.master_edition.to_account_info(),
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.token_account.to_account_info(),
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.instructions_sysvar.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.authorization_rules_program.to_account_info(),
        ctx.accounts.authorization_rules.to_account_info(),
    ];
    invoke(&delegate_instruction, delegate_account_infos.as_slice())?;

    let switch_instruction = Instruction {
        program_id: crate::id(),
        accounts: crate::accounts::Switch {
            auth_rules: ctx.accounts.authorization_rules.key(),
            // token_account: ctx.accounts.token_account.key(),
            nightfury: ctx.accounts.nightfury.key(),
            mint: mint.key(),
            delegate_record: delegate_record_address,
            metadata: metadata_account.key(),
            thread: thread.key(),
            token_metadata_program: token_metadata_program.key(),
            instructions_sysvar: ctx.accounts.instructions_sysvar.key(),
            authorization_rules_program: ctx.accounts.authorization_rules_program.key(),
            token_program: ctx.accounts.token_program.key(),
            system_program: system_program.key(),
            master_edition: ctx.accounts.master_edition.key(),
        }
        .to_account_metas(Some(true)),
        data: crate::instruction::Switch {}.data(),
    };

    let trigger = clockwork_sdk::state::Trigger::Cron {
        schedule: "*/30 * * * * * *".into(),
        skippable: true,
    };

    let thread_authority_bump = *ctx.bumps.get("thread_authority").unwrap();
    clockwork_sdk::cpi::thread_create(
        CpiContext::new_with_signer(
            thread_program.to_account_info(),
            clockwork_sdk::cpi::ThreadCreate {
                payer: ctx.accounts.authority.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                thread: ctx.accounts.thread.to_account_info(),
                authority: ctx.accounts.thread_authority.to_owned().to_account_info(),
            },
            &[&[
                b"thread_authority".as_ref(),
                ctx.accounts.nightfury.key().as_ref(),
                &[thread_authority_bump],
            ]],
        ),
        LAMPORTS_PER_SOL,
        thread_id,
        vec![switch_instruction.into()],
        trigger,
    )?;

    let nightfury = &mut ctx.accounts.nightfury;

    nightfury.thread = ctx.accounts.thread.key();
    nightfury.authority = ctx.accounts.authority.key();
    nightfury.mint = ctx.accounts.mint.key();
    nightfury.day_uri = day_uri;
    nightfury.night_uri = night_uri;
    nightfury.state = NightFuryState::Day;

    Ok(())
}
