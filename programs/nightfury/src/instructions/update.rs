use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use clockwork_sdk::{
    cpi::{thread_update, ThreadUpdate},
    state::{Thread, ThreadAccount, Trigger},
    ThreadProgram,
};

use crate::state::NightFury;

#[derive(Accounts)]
pub struct Update<'info> {
    pub authority: Signer<'info>,
    pub mint: Box<Account<'info, Mint>>,
    #[account(mut, has_one = mint, has_one = thread, has_one = authority)]
    pub nightfury: Account<'info, NightFury>,
    #[account(mut, address = thread.pubkey(), constraint = thread.authority.eq(&nightfury.key()))]
    pub thread: Account<'info, Thread>,
    #[account(address = clockwork_sdk::ID)]
    pub thread_program: Program<'info, ThreadProgram>,
    pub system_program: Program<'info, System>,
}

pub fn process_update(ctx: Context<Update>, schedule: String) -> Result<()> {
    let nightfury = &ctx.accounts.nightfury;
    thread_update(
        CpiContext::new_with_signer(
            ctx.accounts.thread_program.to_account_info(),
            ThreadUpdate {
                authority: ctx.accounts.nightfury.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                thread: ctx.accounts.thread.to_account_info(),
            },
            &[&[
                b"nightfury".as_ref(),
                ctx.accounts.mint.key().as_ref(),
                ctx.accounts.authority.key().as_ref(),
                &[nightfury.bump],
            ]],
        ),
        clockwork_sdk::state::ThreadSettings {
            fee: None,
            instructions: None,
            name: None,
            rate_limit: None,
            trigger: Some(Trigger::Cron {
                schedule,
                skippable: true,
            }),
        },
    )?;

    Ok(())
}
