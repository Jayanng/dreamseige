const fs = require('fs');
const path = require('path');

// Manually resolve viem from frontend/node_modules
const frontendNodeModules = path.resolve(__dirname, '../../frontend/node_modules');
const viemPath = path.join(frontendNodeModules, 'viem');
const { createWalletClient, http, publicActions } = require(path.join(viemPath, '_cjs', 'index.js'));
const { privateKeyToAccount } = require(path.join(viemPath, '_cjs', 'accounts', 'index.js'));

function loadEnv() {
    try {
        const env = fs.readFileSync('.env', 'utf8');
        env.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const v = parts.slice(1).join('=').trim();
                process.env[key] = v;
            }
        });
    } catch (e) {
        console.error('No .env file found');
    }
}
loadEnv();

const rpcUrl = process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
const pk = process.env.DEPLOYER_PRIVATE_KEY;
const account = privateKeyToAccount(pk);

const client = createWalletClient({
    account,
    transport: http(rpcUrl),
}).extend(publicActions);

const NEW_ARENA = '0x6bf38e8a094aa64855bc9b94756079f17b7220f1';
const VAULT = '0x714256500e5b48836b823DF82c5F4CC2A8E88B55';
const LEADERBOARD = '0x95396246b715Ff6a7Db39040E9be43Bdb5701b0b';

const setArenaAbi = [{
  "inputs": [
    { "internalType": "address", "name": "_arena", "type": "address" }
  ],
  "name": "setPvPArena",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
}];

async function wire() {
    try {
        console.log('🔗 Wiring Resource Vault...');
        let hash = await client.writeContract({
            address: VAULT,
            abi: setArenaAbi,
            functionName: 'setPvPArena',
            args: [NEW_ARENA]
        });
        await client.waitForTransactionReceipt({ hash });
        console.log(`✅ Vault wired! Tx: ${hash}`);

        console.log('🔗 Wiring Leaderboard...');
        hash = await client.writeContract({
            address: LEADERBOARD,
            abi: setArenaAbi,
            functionName: 'setPvPArena',
            args: [NEW_ARENA]
        });
        await client.waitForTransactionReceipt({ hash });
        console.log(`✅ Leaderboard wired! Tx: ${hash}`);

    } catch (e) {
        console.error('❌ Wiring Failed:', e);
        process.exit(1);
    }
}

wire();
