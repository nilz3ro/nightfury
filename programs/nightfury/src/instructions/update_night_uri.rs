use anchor_lang::prelude::*;

use crate::state::NightFury;

#[derive(Accounts)]
pub struct UpdateNightUri<'info> {
    pub nightfury: Account<'info, NightFury>,
    pub authority: Signer<'info>,
}

pub fn process_update_night_uri(ctx: Context<UpdateNightUri>, uri: String) -> Result<()> {
    let nightfury = &mut ctx.accounts.nightfury;

    // set night_uri
    nightfury.night_uri = uri;

    Ok(())
}
