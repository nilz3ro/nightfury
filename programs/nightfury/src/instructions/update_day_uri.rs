use anchor_lang::prelude::*;

use crate::state::NightFury;

#[derive(Accounts)]
pub struct UpdateDayUri<'info> {
    pub nightfury: Account<'info, NightFury>,
    pub authority: Signer<'info>,
}

pub fn process_update_day_uri(ctx: Context<UpdateDayUri>, uri: String) -> Result<()> {
    let nightfury = &mut ctx.accounts.nightfury;

    // set day_uri
    nightfury.day_uri = uri;

    Ok(())
}
