import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Nightfury } from "../target/types/nightfury";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";

describe("nightfury", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.NightFury as Program<Nightfury>;

  it("Is initialized!", async () => {
    let authorityKeypair = Keypair.generate();
    await airdrop(program.provider.connection, authorityKeypair.publicKey);

    const initializeIx = await program.methods.initialize(
      "test.com/day",
      "test.com/night",
    ).accounts({
      nightfury: new PublicKey(""),
      mint: new PublicKey(""),
      metadata: new PublicKey(""),
      authority: authorityKeypair.publicKey,
      systemProgram: SystemProgram.programId,
    }).instruction();

    const tx = new Transaction().add(initializeIx);
    // const {blockhash, lastValidBlockHeight} = await program.provider.connection.getLatestBlockhash();

    const sig = await program.provider.connection.sendTransaction(tx, [
      authorityKeypair,
    ], { skipPreflight: true });

    await confirmTransaction(program.provider.connection, sig);
  });
});

let airdrop = async (connection: Connection, recipient: PublicKey) => {
  let sig = await connection.requestAirdrop(recipient, LAMPORTS_PER_SOL);
  await confirmTransaction(connection, sig);
};

let confirmTransaction = async (connection: Connection, signature: string) => {
  let { blockhash, lastValidBlockHeight } = await connection
    .getLatestBlockhash();
  return connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });
};

let findMetadataAddress = async (
  mint: PublicKey,
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddressSync([
    Buffer.from("metadata"),
    TOKEN_METADATA_PROGRAM_ID.toBuffer(),
    mint.toBuffer(),
  ], TOKEN_METADATA_PROGRAM_ID);
};

async function cleanupSol(
  connection: Connection,
  source: Signer,
  target: PublicKey,
) {
  let sourceBalance = await connection.getBalance(source.publicKey);
  let transferInstruction = SystemProgram.transfer({
    fromPubkey: source.publicKey,
    toPubkey: target,
    lamports: sourceBalance - 5000,
  });
  let transaction = new Transaction().add(transferInstruction);
  let signature = await connection.sendTransaction(transaction, [source]);
  await confirmTransaction(connection, signature);
}
