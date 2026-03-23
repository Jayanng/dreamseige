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
const VAULT = '0x714256500e5b48836b823DF82c5F4CC2A8E88B55';
const EMPIRE = '0x1d617cC33411562c0c25Ce35A1B6F08E92d74916';

async function main() {
    console.log('--- Phase 1: Redeploying PvPArena (No Hardcoded Gas) ---');
    const artifact = JSON.parse(fs.readFileSync('out/PvPArena.sol/PvPArena.json', 'utf8'));
    const bytecode = artifact.bytecode.object.startsWith('0x') ? artifact.bytecode.object : `0x${artifact.bytecode.object}`;
    const abi = artifact.abi;

    try {
        console.log(`Broadcasting deployment transaction...`);
        // Omitting 'gas' parameter so it lets the network estimate
        const hash = await client.deployContract({ abi, bytecode });
        console.log(`Deployment Tx: ${hash}`);
        console.log(`Waiting for confirmation (this might take a few seconds)...`);

        const receipt = await client.waitForTransactionReceipt({ hash });
        
        if (receipt.status !== 'success') {
            throw new Error(`Deployment failed! Status: ${receipt.status}, Gas Used: ${receipt.gasUsed}`);
        }
        
        const newArena = receipt.contractAddress;
        console.log(`\n✅ Contract successfully deployed and verified at ${newArena}`);

        console.log('\n--- Phase 2: Verifying Deployment ---');
        const baseAddress = await publicClient.readContract({
            address: newArena, abi, functionName: 'baseContract'
        });
        console.log(`Verified! PvPArena.baseContract() is ${baseAddress}`);

        console.log('\n--- Phase 3: Internal Hub Wiring (PvPArena Setters) ---');
        
        console.log('Setting BaseContract...');
        let tx = await client.writeContract({ address: newArena, abi, functionName: 'setBaseContract', args: [BASE] });
        await client.waitForTransactionReceipt({ hash: tx });
        
        console.log('Setting Leaderboard...');
        tx = await client.writeContract({ address: newArena, abi, functionName: 'setLeaderboard', args: [LEADERBOARD] });
        await client.waitForTransactionReceipt({ hash: tx });
        
        console.log('Setting ResourceVault...');
        tx = await client.writeContract({ address: newArena, abi, functionName: 'setResourceVault', args: [VAULT] });
        await client.waitForTransactionReceipt({ hash: tx });
        
        console.log('Setting EmpireRegistry...');
        tx = await client.writeContract({ address: newArena, abi, functionName: 'setEmpireRegistry', args: [EMPIRE] });
        await client.waitForTransactionReceipt({ hash: tx });
        
        console.log('\n--- Phase 4: External Hub Wiring (Vault/Leaderboard) ---');
        // Using setPvPArena since that is the actual function name in those contracts
        const setArenaAbi = [{ "inputs": [{ "internalType": "address", "name": "_arena", "type": "address" }], "name": "setPvPArena", "outputs": [], "stateMutability": "nonpayable", "type": "function" }];
        
        console.log('Wiring ResourceVault...');
        tx = await client.writeContract({ address: VAULT, abi: setArenaAbi, functionName: 'setPvPArena', args: [newArena] });
        await client.waitForTransactionReceipt({ hash: tx });

        console.log('Wiring LeaderboardContract...');
        tx = await client.writeContract({ address: LEADERBOARD, abi: setArenaAbi, functionName: 'setPvPArena', args: [newArena] });
        await client.waitForTransactionReceipt({ hash: tx });

        console.log(`\n🚀 FULLY WIRED NEW PVP ARENA: ${newArena}`);
        
    } catch (e) {
        console.error('\n❌ Fatal Error:', e.shortMessage || e.message);
        if (e.cause) console.error('Cause:', e.cause);
    }
}
main();
