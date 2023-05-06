use crate::{errors::NightFuryError, state::NightFuryState};
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::{prelude::*, solana_program::native_token::LAMPORTS_PER_SOL};
use anchor_spl::{token::Mint, token_interface::accessor::authority};
use clockwork_sdk::{
    cpi::{thread_create, ThreadCreate},
    state::{Thread, ThreadAccount},
    ThreadProgram,
};
use mpl_token_metadata::{
    state::{Metadata, TokenMetadataAccount},
    // utils::assert_data_valid,
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
    pub nightfury: Account<'info, NightFury>,
    pub mint: Account<'info, Mint>,
    /// CHECK: make sure this is a valid metadata account and that it belongs to the mint.
    pub metadata: UncheckedAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>, // accounts for nft
    #[account(mut, address = Thread::pubkey(nightfury.key(), thread_id))]
    /// CHECK: make sure it's a valid thread
    pub thread: UncheckedAccount<'info>,
    /// CHECK: Make sure this is the real instructions sysvar.
    #[account(seeds = [
        b"thread_authority".as_ref(),
        nightfury.key().as_ref(),
    ], bump)]
    pub thread_authority: Account<'info, NightFury>,
    /// CHECK: Make sure it's the real instructions sysvar.
    pub instructions_sysvar: UncheckedAccount<'info>,
    pub thread_program: Program<'info, ThreadProgram>,
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

    assert_owned_by(&ctx.accounts.metadata, &mpl_token_metadata::id())?;
    let metadata = Metadata::from_account_info(&mut ctx.accounts.metadata)?;

    require!(
        &ctx.accounts.token_metadata_program.key() == &mpl_token_metadata::id(),
        NightFuryError::InvalidTokenMetadataProgram
    );
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

    let mint = &ctx.accounts.mint;
    let metadata = &ctx.accounts.metadata;
    let thread = &ctx.accounts.thread.key();
    let thread_program = &ctx.accounts.thread_program;
    let token_metadata_program = &ctx.accounts.token_metadata_program;
    let instructions_sysvar = &ctx.accounts.instructions_sysvar;
    let system_program = &ctx.accounts.system_program;

    let switch_instruction = Instruction {
        program_id: crate::id(),
        accounts: crate::accounts::Switch {
            nightfury: ctx.accounts.nightfury.key(),
            mint: mint.key(),
            metadata: metadata.key(),
            thread: thread.key(),
            token_metadata_program: token_metadata_program.key(),
            system_program: system_program.key(),
            instructions_sysvar: ctx.accounts.instructions_sysvar.key(),
            authorization_rules_program: ctx.accounts.authorization_rules_program.key(),
        }
        .to_account_metas(Some(true)),
        data: crate::instruction::Switch {}.try_to_vec()?,
    };
    // let thread_create_context = ThreadCreate {

    // 2️⃣ Define a trigger for the thread.
    let trigger = clockwork_sdk::state::Trigger::Cron {
        schedule: "*/10 * * * * * *".into(),
        skippable: true,
    };

    // 3️⃣ Create a Thread via CPI
    let thread_authority_bump = *ctx.bumps.get("thread_authority").unwrap();
    clockwork_sdk::cpi::thread_create(
        CpiContext::new_with_signer(
            thread_program.to_account_info(),
            clockwork_sdk::cpi::ThreadCreate {
                payer: ctx.accounts.thread_authority.to_account_info(),
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
        LAMPORTS_PER_SOL,                // amount
        thread_id,                       // id
        vec![switch_instruction.into()], // instructions
        trigger,                         // trigger
    )?;

    let nightfury = &mut ctx.accounts.nightfury;
    nightfury.thread = ctx.accounts.thread.key();
    nightfury.authority = ctx.accounts.authority.key();
    nightfury.mint = ctx.accounts.mint.key();
    nightfury.day_uri = day_uri;
    nightfury.night_uri = night_uri;
    nightfury.state = NightFuryState::Day;

    // set up clockwork thread
    Ok(())
}
