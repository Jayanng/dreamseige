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

const BASE_CONTRACT = '0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66';
const PVP_ARENA     = '0x67097c8e6be1f1bd8b8094353ac4e7b8cd137b01';
const WALLET_1      = '0x71708D8171F0Af75b0184861906B3678f7337E50';
const WALLET_2      = '0xF9F2393673c1B4c16Eb53ca7e37A5CAf653Bb13e';

async function deployVault() {
    console.log(`\n--- Deploying ResourceVault (v29) ---`);
    const artifact = JSON.parse(fs.readFileSync('out/ResourceVault.sol/ResourceVault.json', 'utf8'));
    const bytecode = artifact.bytecode.object.startsWith('0x') ? artifact.bytecode.object : `0x${artifact.bytecode.object}`;
    const abi = artifact.abi;

    const hash = await client.deployContract({ abi, bytecode });
    console.log(`ResourceVault Deployment Tx: ${hash}`);
    const receipt = await client.waitForTransactionReceipt({ hash });
    console.log(`ResourceVault deployed at: ${receipt.contractAddress}`);
    return { address: receipt.contractAddress, abi };
}

async function main() {
    try {
        // 1. Deploy ResourceVault
        const vault = await deployVault();
        
        // 2. BaseContract.setResourceVault
        console.log('\n--- Syncing BaseContract (0xDaf...) ---');
        const baseAbi = [{ "inputs": [{ "internalType": "address", "name": "_resourceVault", "type": "address" }], "name": "setResourceVault", "outputs": [], "stateMutability": "nonpayable", "type": "function" }];
        let tx = await client.writeContract({ address: BASE_CONTRACT, abi: baseAbi, functionName: 'setResourceVault', args: [vault.address] });
        console.log(`Base Sync Tx: ${tx}`);
        await client.waitForTransactionReceipt({ hash: tx });

        // 3. PvPArena.setResourceVault
        console.log('\n--- Syncing PvPArena (0x670...) ---');
        const arenaAbi = [{ "inputs": [{ "internalType": "address", "name": "_vault", "type": "address" }], "name": "setResourceVault", "outputs": [], "stateMutability": "nonpayable", "type": "function" }];
        tx = await client.writeContract({ address: PVP_ARENA, abi: arenaAbi, functionName: 'setResourceVault', args: [vault.address] });
        console.log(`Arena Sync Tx: ${tx}`);
        await client.waitForTransactionReceipt({ hash: tx });

        // 4. emergencySeed(WALLET_1)
        console.log('\n--- Seeding Wallet 1 (0x717...) ---');
        tx = await client.writeContract({ address: vault.address, abi: vault.abi, functionName: 'emergencySeed', args: [WALLET_1] });
        console.log(`Seed W1 Tx: ${tx}`);
        await client.waitForTransactionReceipt({ hash: tx });

        // 5. emergencySeed(WALLET_2)
        console.log('\n--- Seeding Wallet 2 (0xF9F...) ---');
        tx = await client.writeContract({ address: vault.address, abi: vault.abi, functionName: 'emergencySeed', args: [WALLET_2] });
        console.log(`Seed W2 Tx: ${tx}`);
        await client.waitForTransactionReceipt({ hash: tx });

        console.log(`\n🚀 PHASE 29 SEEDING COMPLETE 🚀`);
        console.log(`NEW_RESOURCE_VAULT: ${vault.address}`);

    } catch (e) {
        console.error('\n❌ Fatal Error:', e.shortMessage || e.message);
        if (e.cause) console.error('Cause:', e.cause);
    }
}

main();
