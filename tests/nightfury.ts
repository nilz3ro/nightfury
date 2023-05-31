import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { ClockworkProvider } from "@clockwork-xyz/sdk";
import { Nightfury } from "../target/types/nightfury";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  Metadata,
  MetadataDelegateRole,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  keypairIdentity,
  Metaplex,
  mockStorage,
} from "@metaplex-foundation/js";
import * as mplAuth from "@metaplex-foundation/mpl-token-auth-rules";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("nightfury", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Nightfury as Program<Nightfury>;
  const clockworkProvider = ClockworkProvider.fromAnchorProvider(
    anchor.AnchorProvider.env(),
  );


  it("Is initialized!", async () => {
    // Setup test
    const authorityKeypair = Keypair.fromSecretKey(Buffer.from(
      JSON.parse(
        require("fs").readFileSync("./nightfury-authority.json", "utf8"),
      ),
    ));
    const balance = await anchor.getProvider().connection.getBalance(
      authorityKeypair.publicKey,
    );
    console.log("balance", balance);
    await airdrop(anchor.getProvider().connection, authorityKeypair.publicKey);

    // Create the nightfury pnft.
    console.log("building metaplex");
    const metaplex = new Metaplex(anchor.getProvider().connection).use(
      keypairIdentity(authorityKeypair),
    ).use(mockStorage());
    let pnft: any = null;
    console.log("creating nft");
    const rulesetAddress = new PublicKey(
      "eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9",
    );
    try {
      const pnftInner = await metaplex.nfts().create({
        tokenStandard: TokenStandard.ProgrammableNonFungible,
        sellerFeeBasisPoints: 500,
        ruleSet: rulesetAddress,
        uri: "test.com/day",
        name: "Angry Evening",
        symbol: "NIGHT",
        collection: Keypair.generate().publicKey,
        isCollection: false,
        creators: [{ address: authorityKeypair.publicKey, share: 100 }],
      });

      pnft = pnftInner;
      console.log(pnftInner);
    } catch (e) {
      console.log("problem with nft creation");
      console.log(e);
    }
    const [nightfuryAddress] = findNightFuryAddress(
      pnft.mintAddress,
      authorityKeypair.publicKey,
      program.programId,
    );

    // Initialize the nightfury program.
    const threadId = Buffer.from("test");
    const [threadAddress, _] = clockworkProvider.getThreadPDA(
      nightfuryAddress,
      threadId.toString(),
    );
    let [delegateRecordAddress] = findDelegateRecordAddress(
      pnft.mintAddress,
      threadAddress,
      authorityKeypair.publicKey,
    );
    const accounts = {
      nightfury: nightfuryAddress,
      mint: pnft.mintAddress,
      tokenAccount: pnft.tokenAddress,
      masterEdition: pnft.masterEditionAddress,
      delegateRecord: delegateRecordAddress,
      metadata: pnft.metadataAddress,
      authority: authorityKeypair.publicKey,
      thread: threadAddress,
      authorizationRules: rulesetAddress,
      instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      threadProgram: clockworkProvider.threadProgram.programId,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      authorizationRulesProgram: mplAuth.PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };
    for (let account in accounts) {
      console.log(account, accounts[account].toString());
    }
    const compBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 400_000,
    });
    const initializeIx = await program.methods.initialize(
      threadId,
      "test.com/day",
      "test.com/night",
    ).accounts({
      nightfury: nightfuryAddress,
      mint: pnft.mintAddress,
      tokenAccount: pnft.tokenAddress,
      masterEdition: pnft.masterEditionAddress,
      delegateRecord: delegateRecordAddress,
      metadata: pnft.metadataAddress,
      authority: authorityKeypair.publicKey,
      thread: threadAddress,
      authorizationRules: rulesetAddress,
      instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      threadProgram: clockworkProvider.threadProgram.programId,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      authorizationRulesProgram: mplAuth.PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    }).instruction();
    try {
      const tx = new Transaction().add(compBudgetIx).add(initializeIx);
      const sig = await anchor.getProvider().connection.sendTransaction(tx, [
        authorityKeypair,
      ]);
      await confirmTransaction(anchor.getProvider().connection, sig);
    } catch (e) {
      console.log("problem with intitialize", e);
    }

    console.log("Sleeping");
    await sleep(90000);
    console.log("awake!");

    // Test revoke
    let revokeIx = await program.methods.revoke().accounts({      
      nightfury: nightfuryAddress,
      mint: pnft.mintAddress,
      masterEdition: pnft.masterEditionAddress,
      delegateRecord: delegateRecordAddress,
      metadata: pnft.metadataAddress,
      authority: authorityKeypair.publicKey,
      thread: threadAddress,
      authorizationRules: rulesetAddress,
      instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      threadProgram: clockworkProvider.threadProgram.programId,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      authorizationRulesProgram: mplAuth.PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    }).instruction();
    try {
      const tx = new Transaction().add(revokeIx);
      const sig = await anchor.getProvider().connection.sendTransaction(tx, [
        authorityKeypair,
      ]);
      await confirmTransaction(anchor.getProvider().connection, sig);
    } catch (e) {
      console.log("problem with revoke", e);
    }
    
  });

});

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

let airdrop = async (connection: Connection, recipient: PublicKey) => {
  let sig = await connection.requestAirdrop(recipient, 10 * LAMPORTS_PER_SOL);
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

let findNightFuryAddress = (
  mint: PublicKey,
  authority: PublicKey,
  programId: PublicKey,
): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync([
    Buffer.from("nightfury"),
    mint.toBuffer(),
    authority.toBuffer(),
  ], programId);
};

let findThreadAuthorityAddress = (
  nightfuryAddress: PublicKey,
  programId: PublicKey,
) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("thread_authority"), nightfuryAddress.toBuffer()],
    programId,
  );
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

function findDelegateRecordAddress(
  mint: PublicKey,
  delegate: PublicKey,
  updateAuthority: PublicKey,
) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("data_item_delegate"),
      // Buffer.from("collection_item_delegate"),
      updateAuthority.toBuffer(),
      delegate.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  );
}
