mod errors;
mod instructions;
mod state;

use anchor_lang::prelude::*;

use instructions::*;

declare_id!("A85kZ2k7fFzNSzYH169Cbd6ywE6X4zvNXy9xCLHQ2mvB");

#[program]
pub mod nightfury {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        thread_id: Vec<u8>,
        day_uri: String,
        night_uri: String,
    ) -> Result<()> {
        process_initialize(ctx, thread_id, day_uri, night_uri)
    }

    pub fn switch(ctx: Context<Switch>) -> Result<()> {
        process_switch(ctx)
    }

    pub fn update_day_uri(ctx: Context<UpdateDayUri>, uri: String) -> Result<()> {
        process_update_day_uri(ctx, uri)
    }

    pub fn update_night_uri(ctx: Context<UpdateNightUri>, uri: String) -> Result<()> {
        process_update_night_uri(ctx, uri)
    }
}
