
'use strict';

const { LOCALHOST, tmpLedgerDir } = require('@metaplex-foundation/amman');
const path = require('path');

const validator = {
    killRunningValidators: true,
    commitment: 'singleGossip',
    resetLedger: true,
    verifyFees: false,
    jsonRpcUrl: LOCALHOST,
    websocketUrl: '',
    ledgerDir: tmpLedgerDir(),
    programs: [
        // {
        //     label: 'token_metadata',
        //     programId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
        //     // deployPath: path.join(__dirname, 'test-programs/mpl_token_metadata.so'),
        //     deployPath: './test-programs/mpl_token_metadata.so',
        // },
    ],
    accountsCluster: 'https://api.mainnet-beta.solana.com',
    // accountsCluster: 'http://api.devnet.solana.com',
    accounts: [
        {
            label: 'token_metadata',
            accountId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
            executable: true,
        },
        {
            label: 'authorization_rules',
            accountId: 'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg',
            executable: true
        },
        {
            label: 'ruleset',
            accountId: 'eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9',
            executable: false
        }
    ]
};

const storage = {
    enabled: true,
    storageId: 'mock-storage',
    clearOnStart: true,
};

module.exports = { validator, storage };
