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
        fs.readFileSync("/home/nilz3ro/llaves/clayno-ua.json", "utf8")
        // fs.readFileSync("/home/nilz3ro/keez/n1z.json", "utf8")
    )));

    const connection = new Connection(clusterApiUrl("mainnet-beta"));
    const metaplex = Metaplex.make(connection).use(keypairIdentity(adminKeypair));

    const nftData = await metaplex.nfts().findByMint({ mintAddress: mint });

    console.log("FINISHING FETCH");
    return [nftData as Nft, adminKeypair]
}

const setupNightFury = async ([nft, adminKeypair], config: NightFuryConfig) => {
    console.log("IN SETUP");
    const connection = new Connection(clusterApiUrl("mainnet-beta"));

    console.log("building provider");
    const anchorProvider = new anchor.AnchorProvider(connection, new anchor.Wallet(adminKeypair), { commitment: "confirmed" });
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
        config.threadId,
        program.programId,
    );

    const [threadAuthorityAddress] = findThreadAuthorityAddress(
        nightFuryAddress,
        program.programId,
    );

    const [threadAddress, threadBump] = clockworkProvider.getThreadPDA(
        nightFuryAddress,
        config.threadId.toString(),
    );

    let [delegateRecordAddress] = findDelegateRecordAddress(
        nft.mint.address,
        threadAddress,
        adminKeypair.publicKey,
    );

    console.log(nft);
    // const tokenAddress = await getAssociatedTokenAddress(nft.mint.address, adminKeypair.publicKey);
    const tokenAddress = await getAssociatedTokenAddress(nft.mint.address, new PublicKey("DSgfpCxMV8bbRLYjcx6a3AtCufKkQpt2pNu34znYFZDm"), true);

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
        masterEdition: nft.edition.address,
        delegateRecord: delegateRecordAddress,
        metadata: nft.metadataAddress,
        authority: adminKeypair.publicKey,
        thread: threadAddress,
        authorizationRules: nft.programmableConfig.ruleSet,
        instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        threadProgram: clockworkProvider.threadProgram.programId,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        tokenAccount: tokenAddress,
        authorizationRulesProgram: mplAuth.PROGRAM_ID,
        systemProgram: SystemProgram.programId,
    }).instruction();

    const { blockhash } = await connection.getLatestBlockhash();
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
    const anchorProvider = new anchor.AnchorProvider(connection, new anchor.Wallet(adminKeypair), { commitment: "confirmed" });
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
        config.threadId,
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
    console.log("threadaddress", threadAddress);

    const accounts = {
        authority: adminKeypair.publicKey,
        nightfury: nightFuryAddress,
        // thread: threadAddress,
        // thread: new PublicKey("6VmTrSU7tnHN591HuToZ1SA4R21pVgcsKu33Tx7YvHWQ"),
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

    };

    for (const account in accounts) {
        console.log(account, accounts[account].toString());
    }

    let nightfury = await program.account.nightFury.fetch(nightFuryAddress)
    console.log(nightfury);
    // return

    const revokeIx = await program.methods.revoke().accounts({
        authority: adminKeypair.publicKey,
        nightfury: nightFuryAddress,
        // thread: threadAddress,
        thread: new PublicKey("6VmTrSU7tnHN591HuToZ1SA4R21pVgcsKu33Tx7YvHWQ"),
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

    const { blockhash } = await connection.getLatestBlockhash();
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
    threadId: Buffer,
    programId: PublicKey,
): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync([
        Buffer.from("nightfury"),
        mint.toBuffer(),
        authority.toBuffer(),
        threadId
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

const bouncyPuff1MintAddress = new PublicKey("8cqUktM6h1VDKftwLSDhgiG1xphTxaqdttFfCw1aoMyQ")
const bouncyPuff2MintAddress = new PublicKey("EP8GNoirSbDqncdGgghCDhavobQjRee6McG5xZYUWphP")
const bouncyPuff3MintAddress = new PublicKey("Fp16FZZZAemqkS8uB2ATyqLcaG61k5FGyGSqYRfs5Y4U")

const execute = async (mint: PublicKey, config: NightFuryConfig) => {
    const nft = await fetchNFT(mint);
    // await setupNightFury(nft, config);
    // await revokeNightFury(nft, config);
    await updateNightfury(nft, config);
    
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

const updateNightfury = async ([nft, adminKeypair], config: NightFuryConfig) => {
    console.log("IN UPDATE");
    const connection = new Connection(clusterApiUrl("mainnet-beta"));

    console.log("building provider");
    const anchorProvider = new anchor.AnchorProvider(connection, new anchor.Wallet(adminKeypair), { commitment: "confirmed" });
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
        config.threadId,
        program.programId,
    );

    const [threadAuthorityAddress] = findThreadAuthorityAddress(
        nightFuryAddress,
        program.programId,
    );

    const [threadAddress, threadBump] = clockworkProvider.getThreadPDA(
        nightFuryAddress,
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
    //     nightfury: nightFuryAddress,
    //     mint: nft.mint.address,
    //     tokenAccount: tokenAddress,
    //     masterEdition: nft.edition.address,
    //     delegateRecord: delegateRecordAddress,
    //     metadata: nft.metadataAddress,
    //     authority: adminKeypair.publicKey,
    //     threadAuthority: threadAuthorityAddress,
    //     thread: threadAddress,
    //     authorizationRules: nft.programmableConfig.ruleSet,
    //     instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
    //     threadProgram: clockworkProvider.threadProgram.programId,
    //     tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    //     authorizationRulesProgram: mplAuth.PROGRAM_ID,
    //     systemProgram: SystemProgram.programId,
    // };

    // for (const account in accounts) {
    //     console.log(accounts[account].toString());
    // }

    // const initIx = await program.methods.initialize(config.threadId, config.dayURI, config.nightURI).accounts({
    //     nightfury: nightFuryAddress,
    //     mint: nft.mint.address,
    //     tokenAccount: tokenAddress,
    //     masterEdition: nft.edition.address,
    //     delegateRecord: delegateRecordAddress,
    //     metadata: nft.metadataAddress,
    //     authority: adminKeypair.publicKey,
    //     thread: threadAddress,
    //     authorizationRules: nft.programmableConfig.ruleSet,
    //     instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
    //     threadProgram: clockworkProvider.threadProgram.programId,
    //     tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    //     authorizationRulesProgram: mplAuth.PROGRAM_ID,
    //     systemProgram: SystemProgram.programId,
    // }).instruction();

    // pub authority: Signer<'info>,
    // pub mint: Box<Account<'info, Mint>>,
    // #[account(mut, has_one = mint, has_one = thread, has_one = authority)]
    // pub nightfury: Account<'info, NightFury>,
    // #[account(mut, address = thread.pubkey(), constraint = thread.authority.eq(&nightfury.key()))]
    // pub thread: Account<'info, Thread>,
    // #[account(address = clockwork_sdk::ID)]
    // pub thread_program: Program<'info, ThreadProgram>,
    // pub system_program: Program<'info, System>,
    const updateIx = await program.methods.update("00 00 */12 * * * *").accounts({
        authority: adminKeypair.publicKey,
        mint: nft.mint.address,
        nightfury: nightFuryAddress,
        thread: threadAddress,
        threadProgram: clockworkProvider.threadProgram.programId,
        systemProgram: SystemProgram.programId
    }).instruction();

    const { blockhash } = await connection.getLatestBlockhash();
    const message = new TransactionMessage({
        payerKey: adminKeypair.publicKey,
        instructions: [updateIx],
        recentBlockhash: blockhash
    }).compileToV0Message();
    const tx = new VersionedTransaction(message);
    tx.sign([adminKeypair]);
    const signature = await connection.sendTransaction(tx);

    console.log(signature);

}

// execute(bouncyPuff1MintAddress, {
//     threadId: Buffer.from("puff111"),
//     dayURI: "https://arweave.net/FYdMNJKOXlSrJAMamr-08nc3kFdDgK-6N_iqbxiLeK4",
//     nightURI: "https://green-implicit-heron-792.mypinata.cloud/ipfs/QmQTugyrEzdezMnsNMqmPQbUUg6RUfxRjECz2ccmELb6ks"
// })
//     .then(() => console.log("done"));


const dawnMintAddress = new PublicKey("4d3CtWyA76yZLmwaaiuF9kgWbd3pMmZnHZtRUoNAP67e");
execute(dawnMintAddress, {
    threadId: Buffer.from("dawn"),
    dayURI: "https://arweave.net/kXmoE2sbjPuasOvn4XO0mskR_gvQgpZLpoagDYO7rS0",
    nightURI: "https://shdw-drive.genesysgo.net/5cfC56yQNUSVJCUStUf95JGiuBLEaMfgfab7MGDEWQSo/10222.json"
}).then(() => console.log("done"));