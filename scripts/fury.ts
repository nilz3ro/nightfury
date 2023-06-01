import { Transaction, VersionedTransaction, TransactionMessage, SystemProgram, PublicKey, Connection, Keypair, ComputeBudgetProgram, SYSVAR_INSTRUCTIONS_PUBKEY, clusterApiUrl } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { ClockworkProvider } from "@clockwork-xyz/sdk";
import { Program } from "@project-serum/anchor";
import { Nightfury } from "../target/types/nightfury";
import { Metaplex, Nft, keypairIdentity } from "@metaplex-foundation/js";
import {
    PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID
} from "@metaplex-foundation/mpl-token-metadata";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import fs from "fs";
import * as mplAuth from "@metaplex-foundation/mpl-token-auth-rules";

interface NightFuryConfig {
    dayURI: string;
    nightURI: string;
    threadId: Buffer;
}

const fetchNFT = async (mint: PublicKey): Promise<[Nft, Keypair]> => {
    const adminKeypair = Keypair.fromSecretKey(Buffer.from(JSON.parse(
        fs.readFileSync("/home/nilz3ro/keez/n1z.json", "utf8")
    )));

    const connection = new Connection(clusterApiUrl("mainnet-beta"));
    const metaplex =  Metaplex.make(connection).use(keypairIdentity(adminKeypair));

    const nftData = await metaplex.nfts().findByMint({ mintAddress: mint });

    console.log("FINISHING FETCH");
    return [nftData as Nft, adminKeypair]
}

const setupNightFury = async ([nft, adminKeypair], config: NightFuryConfig) => {
    console.log("IN SETUP");
    const connection = new Connection(clusterApiUrl("mainnet-beta"));

    console.log("building provider");
    const anchorProvider = new anchor.AnchorProvider(connection, new anchor.Wallet(adminKeypair), {commitment: "confirmed"});
    // const anchorProvider = anchor.AnchorProvider.env();

    console.log("setting provider");
    anchor.setProvider(anchorProvider);

    console.log("setting up program");

    const program = anchor.workspace.Nightfury as Program<Nightfury>;
    console.log("past program");
    const clockworkProvider = ClockworkProvider.fromAnchorProvider(
        anchorProvider
    );
    console.log("past clockwork provider");

    const compBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 });


    const [nightFuryAddress] = findNightFuryAddress(
      nft.mint.address,
      adminKeypair.publicKey,
      program.programId,
    );

    const [threadAuthorityAddress] = findThreadAuthorityAddress(
      nightFuryAddress,
      program.programId,
    );

    const [threadAddress, threadBump] = clockworkProvider.getThreadPDA(
      threadAuthorityAddress,
      config.threadId.toString(),
    );

    let [delegateRecordAddress] = findDelegateRecordAddress(
      nft.mint.address,
      threadAddress,
      adminKeypair.publicKey,
    );

    console.log(nft);
    const tokenAddress = await getAssociatedTokenAddress(nft.mint.address, adminKeypair.publicKey);

    const accounts = {
      nightfury: nightFuryAddress,
      mint: nft.mint.address,
      tokenAccount: tokenAddress,
      masterEdition: nft.edition.address,
      delegateRecord: delegateRecordAddress,
      metadata: nft.metadataAddress,
      authority: adminKeypair.publicKey,
      threadAuthority: threadAuthorityAddress,
      thread: threadAddress,
      authorizationRules: nft.programmableConfig.ruleSet,
      instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      threadProgram: clockworkProvider.threadProgram.programId,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      authorizationRulesProgram: mplAuth.PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };

    for (const account in accounts) {
        console.log(accounts[account].toString());
    }

    const initIx = await program.methods.initialize(config.threadId, config.dayURI, config.nightURI).accounts({
      nightfury: nightFuryAddress,
      mint: nft.mint.address,
      tokenAccount: tokenAddress,
      masterEdition: nft.edition.address,
      delegateRecord: delegateRecordAddress,
      metadata: nft.metadataAddress,
      authority: adminKeypair.publicKey,
      thread: threadAddress,
      authorizationRules: nft.programmableConfig.ruleSet,
      instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      threadProgram: clockworkProvider.threadProgram.programId,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      authorizationRulesProgram: mplAuth.PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    }).instruction();

    const {blockhash} = await connection.getLatestBlockhash();
    const message = new TransactionMessage({
        payerKey: adminKeypair.publicKey,
        instructions: [compBudgetIx, initIx],
        recentBlockhash: blockhash
    }).compileToV0Message();
    const tx = new VersionedTransaction(message);
    tx.sign([adminKeypair]);
    const signature = await connection.sendTransaction(tx);

    console.log(signature);
}

 

const revokeNightFury = async ([nft, adminKeypair], config: NightFuryConfig) => {
    console.log("IN REVOKE");
    const connection = new Connection(clusterApiUrl("mainnet-beta"));

    console.log("building provider");
    const anchorProvider = new anchor.AnchorProvider(connection, new anchor.Wallet(adminKeypair), {commitment: "confirmed"});
    // const anchorProvider = anchor.AnchorProvider.env();

    console.log("setting provider");
    anchor.setProvider(anchorProvider);

    console.log("setting up program");

    const program = anchor.workspace.Nightfury as Program<Nightfury>;
    console.log("past program");
    const clockworkProvider = ClockworkProvider.fromAnchorProvider(
        anchorProvider
    );
    console.log("past clockwork provider");

    const compBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 });


    const [nightFuryAddress] = findNightFuryAddress(
      nft.mint.address,
      adminKeypair.publicKey,
      program.programId,
    );

    const [threadAuthorityAddress] = findThreadAuthorityAddress(
      nightFuryAddress,
      program.programId,
    );

    const [threadAddress, threadBump] = clockworkProvider.getThreadPDA(
      threadAuthorityAddress,
      config.threadId.toString(),
    );

    let [delegateRecordAddress] = findDelegateRecordAddress(
      nft.mint.address,
      threadAddress,
      adminKeypair.publicKey,
    );

    console.log(nft);
    const tokenAddress = await getAssociatedTokenAddress(nft.mint.address, adminKeypair.publicKey);

    // const accounts = {
    //   nightfury: nightFuryAddress,
    //   mint: nft.mint.address,
    //   tokenAccount: tokenAddress,
    //   masterEdition: nft.edition.address,
    //   delegateRecord: delegateRecordAddress,
    //   metadata: nft.metadataAddress,
    //   authority: adminKeypair.publicKey,
    //   threadAuthority: threadAuthorityAddress,
    //   thread: threadAddress,
    //   authorizationRules: nft.programmableConfig.ruleSet,
    //   instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
    //   threadProgram: clockworkProvider.threadProgram.programId,
    //   tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    //   authorizationRulesProgram: mplAuth.PROGRAM_ID,
    //   systemProgram: SystemProgram.programId,
    // };

    // for (const account in accounts) {
    //     console.log(accounts[account].toString());
    // }

    // const initIx = await program.methods.initialize(config.threadId, config.dayURI, config.nightURI).accounts({
    //   nightfury: nightFuryAddress,
    //   mint: nft.mint.address,
    //   tokenAccount: tokenAddress,
    //   masterEdition: nft.edition.address,
    //   delegateRecord: delegateRecordAddress,
    //   metadata: nft.metadataAddress,
    //   authority: adminKeypair.publicKey,
    //   thread: threadAddress,
    //   authorizationRules: nft.programmableConfig.ruleSet,
    //   instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
    //   threadProgram: clockworkProvider.threadProgram.programId,
    //   tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    //   authorizationRulesProgram: mplAuth.PROGRAM_ID,
    //   systemProgram: SystemProgram.programId,
    // }).instruction();

    const revokeIx = await program.methods.revoke().accounts({
        authority: adminKeypair.publicKey,
        nightfury: nightFuryAddress,
        thread: threadAddress,
        mint: nft.mint.address,
        metadata: nft.metadataAddress,
        masterEdition: nft.edition.address,
        delegateRecord: delegateRecordAddress,
        authorizationRules: nft.programmableConfig.ruleSet,
        instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        authorizationRulesProgram: mplAuth.PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        threadProgram: clockworkProvider.threadProgram.programId,
        systemProgram: SystemProgram.programId
    }).instruction();

    const {blockhash} = await connection.getLatestBlockhash();
    const message = new TransactionMessage({
        payerKey: adminKeypair.publicKey,
        instructions: [compBudgetIx, revokeIx],
        recentBlockhash: blockhash
    }).compileToV0Message();
    const tx = new VersionedTransaction(message);
    tx.sign([adminKeypair]);
    const signature = await connection.sendTransaction(tx);

    console.log(signature);
}



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
    source: anchor.web3.Signer,
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

const bouncyPuff1MintAddress = new PublicKey("NtT6bzSrYPBsyV39rJzL8xbZB2ZSc1CbAzsT34RyWjd")
const bouncyPuff2MintAddress = new PublicKey("9YAnMV1DiF7xYk9HrfoCUbwDamA3WPMq6Ak26HnZ7qXj")
const bouncyPuff3MintAddress = new PublicKey("3xoMxJDJf3bSkaZp6yVZbsvEDLYaX4tWcb4cs8Hd8fNr")

const execute = async (mint: PublicKey, config: NightFuryConfig) => {
    const nft = await fetchNFT(mint);
    await setupNightFury(nft, config);
    // await revokeNightFury(nft, config);
}

// execute(bouncyPuff1MintAddress, {
//     threadId: Buffer.from("puff1"),
//     dayURI: "https://arweave.net/gUWdpF4CFF-0FmolL8j0fkD8NSsNBRCYkZhejJ3sQ_Q",
//     nightURI: "https://green-implicit-heron-792.mypinata.cloud/ipfs/Qmd9J6GfYYnzjUfLCjD7Pbv1ysCTaHr42yxsF44msE8qk7"
// })
// .then(() => console.log("done"));

// execute(bouncyPuff2MintAddress, {
//     threadId: Buffer.from("puff1"),
//     dayURI: "https://arweave.net/4hrDAnqBLNJ4eNBRDLnE_1Zkr_VLxsTcJJjakKiN1nk",
//     nightURI: "https://green-implicit-heron-792.mypinata.cloud/ipfs/QmcLiH3D53TTgtq4WNpzf9qTNPdkmsVoZ8RedUUgan6GcJ"
// })
// .then(() => console.log("done"));

execute(bouncyPuff3MintAddress, {
    threadId: Buffer.from("puff2"),
    dayURI: "https://arweave.net/FYdMNJKOXlSrJAMamr-08nc3kFdDgK-6N_iqbxiLeK4",
    nightURI: "https://green-implicit-heron-792.mypinata.cloud/ipfs/QmQTugyrEzdezMnsNMqmPQbUUg6RUfxRjECz2ccmELb6ks"
})
.then(() => console.log("done"));