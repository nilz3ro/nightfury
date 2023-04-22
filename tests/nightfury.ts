import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { NightFury } from "../target/types/nightfury";

describe("nightfury", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.NightFury as Program<NightFury>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
