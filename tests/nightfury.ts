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
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
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

  // console.log("programId?", program.programId.toString());
  // console.log("program?", program);
  console.log(TOKEN_PROGRAM_ID.toString());

  it("Is initialized!", async () => {
    const authorityKeypair = Keypair.fromSecretKey(Buffer.from(
      JSON.parse(
        require("fs").readFileSync("./nightfury-authority.json", "utf8"),
      ),
    ));

    const balance = await anchor.getProvider().connection.getBalance(
      authorityKeypair.publicKey,
    );

    console.log("balance", balance);
    // let authorityKeypair = Keypair.generate();
    await airdrop(anchor.getProvider().connection, authorityKeypair.publicKey);

    console.log("building metaplex");
    const metaplex = new Metaplex(anchor.getProvider().connection).use(
      keypairIdentity(authorityKeypair),
    ).use(mockStorage());

    let pnft: any = null;
    console.log("creating nft");
    try {
      const pnftInner = await metaplex.nfts().create({
        tokenStandard: TokenStandard.ProgrammableNonFungible,
        sellerFeeBasisPoints: 500,
        ruleSet: new PublicKey("eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9"),
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
    // const nft = await
    const [nightFuryAddress] = findNightFuryAddress(
      pnft.mintAddress,
      authorityKeypair.publicKey,
      program.programId,
    );

    console.log("building init");
    const initializeIx = await program.methods.initialize(
      "test.com/day",
      "test.com/night",
    ).accounts({
      nightfury: nightFuryAddress,
      mint: pnft.mintAddress,
      metadata: pnft.metadataAddress,
      authority: authorityKeypair.publicKey,
      systemProgram: SystemProgram.programId,
    }).instruction();

    try {
      const tx = new Transaction().add(initializeIx);
      // const {blockhash, lastValidBlockHeight} = await program.provider.connection.getLatestBlockhash();

      console.log("sending init");
      const sig = await anchor.getProvider().connection.sendTransaction(tx, [
        authorityKeypair,
      ]);

      await confirmTransaction(anchor.getProvider().connection, sig);
    } catch (e) {
      console.log("problem with intitialize", e);
    }

    const nightFury = await program.account.nightFury.fetch(nightFuryAddress);

    console.log("nightfury before", nightFury);

    try {
      const switchIx = await program.methods.switch().accounts({
        nightfury: nightFuryAddress,
        mint: pnft.mintAddress,
        metadata: pnft.metadataAddress,
        authority: authorityKeypair.publicKey,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        authorizationRulesProgram: mplAuth.PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        // authRules: new PublicKey("eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9"),
      }).instruction();

      const switchTx = new Transaction().add(switchIx);

      const switchSig = await anchor.getProvider().connection.sendTransaction(
        switchTx,
        [authorityKeypair],
        { skipPreflight: true },
      );

      await confirmTransaction(anchor.getProvider().connection, switchSig);

      const nightFuryAfter = await program.account.nightFury.fetch(
        nightFuryAddress,
      );

      console.log("nightfury", nightFuryAfter);
    } catch (e) {
      console.log(e);
    }

    const metadataAfter = await metaplex.nfts().findByMint({
      mintAddress: pnft.mintAddress,
    });

    console.log(metadataAfter);

    // await cleanupSol(
    //   anchor.getProvider().connection,
    //   authorityKeypair,
    //   new PublicKey("4CoUdfiiRKfksBncrqEfVfra8DU9nYb61oGamXsFAUQf"),
    // );
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
