const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, publicActions } = require('C:\\Users\\dell\\Documents\\VS_code\\dreamsiege\\frontend\\node_modules\\viem\\_cjs\\index.js');
const { privateKeyToAccount } = require('C:\\Users\\dell\\Documents\\VS_code\\dreamsiege\\frontend\\node_modules\\viem\\_cjs\\accounts\\index.js');

function loadEnv() {
    try {
        const env = fs.readFileSync('.env', 'utf8');
        env.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
        });
    } catch (e) {}
}
loadEnv();

const rpcUrl = 'https://dream-rpc.somnia.network';
const pk = process.env.DEPLOYER_PRIVATE_KEY;

if (!pk) {
    console.error('Missing DEPLOYER_PRIVATE_KEY');
    process.exit(1);
}

const account = privateKeyToAccount(pk);
const client = createWalletClient({ account, transport: http(rpcUrl) }).extend(publicActions);
const publicClient = createPublicClient({ transport: http(rpcUrl) });

const BASE = '0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66';
const LEADERBOARD = '0x95396246b715Ff6a7Db39040E9be43Bdb5701b0b';
const EMPIRE = '0x1d617cC33411562c0c25Ce35A1B6F08E92d74916';

async function deploy(name, artifactPath) {
    console.log(`\n--- Deploying ${name} ---`);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const bytecode = artifact.bytecode.object.startsWith('0x') ? artifact.bytecode.object : `0x${artifact.bytecode.object}`;
    const abi = artifact.abi;

    const hash = await client.deployContract({ abi, bytecode });
    console.log(`${name} Deployment Tx: ${hash}`);
    const receipt = await client.waitForTransactionReceipt({ hash });
    console.log(`${name} deployed at: ${receipt.contractAddress}`);
    return { address: receipt.contractAddress, abi };
}

async function main() {
    try {
        // 1. Deploy ResourceVault
        const vault = await deploy('ResourceVault', 'out/ResourceVault.sol/ResourceVault.json');
        
        // 2. Deploy PvPArena
        const arena = await deploy('PvPArena', 'out/PvPArena.sol/PvPArena.json');

        console.log('\n--- Wiring Internal Setters (PvPArena) ---');
        
        console.log('Setting BaseContract...');
        let tx = await client.writeContract({ address: arena.address, abi: arena.abi, functionName: 'setBaseContract', args: [BASE] });
        await client.waitForTransactionReceipt({ hash: tx });

        console.log('Setting Leaderboard...');
        tx = await client.writeContract({ address: arena.address, abi: arena.abi, functionName: 'setLeaderboard', args: [LEADERBOARD] });
        await client.waitForTransactionReceipt({ hash: tx });

        console.log('Setting ResourceVault...');
        tx = await client.writeContract({ address: arena.address, abi: arena.abi, functionName: 'setResourceVault', args: [vault.address] });
        await client.waitForTransactionReceipt({ hash: tx });

        console.log('Setting EmpireRegistry...');
        tx = await client.writeContract({ address: arena.address, abi: arena.abi, functionName: 'setEmpireRegistry', args: [EMPIRE] });
        await client.waitForTransactionReceipt({ hash: tx });

        console.log('\n--- Wiring External Setters (Vault/Leaderboard) ---');
        const setArenaAbi = [{ "inputs": [{ "internalType": "address", "name": "_arena", "type": "address" }], "name": "setPvPArena", "outputs": [], "stateMutability": "nonpayable", "type": "function" }];

        console.log('Re-wiring ResourceVault...');
        tx = await client.writeContract({ address: vault.address, abi: vault.abi, functionName: 'setPvPArena', args: [arena.address] });
        await client.waitForTransactionReceipt({ hash: tx });

        console.log('Re-wiring LeaderboardContract...');
        tx = await client.writeContract({ address: LEADERBOARD, abi: setArenaAbi, functionName: 'setPvPArena', args: [arena.address] });
        await client.waitForTransactionReceipt({ hash: tx });

        console.log(`\n🚀 PHASE 28 DEPLOYMENT COMPLETE 🚀`);
        console.log(`NEW_RESOURCE_VAULT: ${vault.address}`);
        console.log(`NEW_PVP_ARENA:      ${arena.address}`);

    } catch (e) {
        console.error('\n❌ Fatal Error:', e.shortMessage || e.message);
        if (e.cause) console.error('Cause:', e.cause);
    }
}

main();
