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
const account = privateKeyToAccount(pk);
const client = createWalletClient({ account, transport: http(rpcUrl) }).extend(publicActions);

const BASE_CONTRACT = '0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66';
const PVP_ARENA     = '0x67097c8e6be1f1bd8b8094353ac4e7b8cd137b01';
const WALLET_1      = '0x71708D8171F0Af75b0184861906B3678f7337E50';
const WALLET_2      = '0xF9F2393673c1B4c16Eb53ca7e37A5CAf653Bb13e';

async function main() {
    console.log('--- EMERGENCY RESTORATION SEQUENCE START ---');

    try {
        // STEP 1 & 2: (Already verified in ResourceVault.sol)

        // STEP 3: Redeploy ResourceVault
        console.log('\n[STEP 3] Redeploying ResourceVault...');
        const artifact = JSON.parse(fs.readFileSync('out/ResourceVault.sol/ResourceVault.json', 'utf8'));
        const bytecode = artifact.bytecode.object.startsWith('0x') ? artifact.bytecode.object : `0x${artifact.bytecode.object}`;
        const vaultAbi = artifact.abi;
        const deployHash = await client.deployContract({ abi: vaultAbi, bytecode });
        const receipt = await client.waitForTransactionReceipt({ hash: deployHash });
        const NEW_VAULT = receipt.contractAddress;
        console.log(`✅ ResourceVault deployed at: ${NEW_VAULT}`);

        // STEP 4a: BaseContract.setResourceVault
        console.log('\n[STEP 4a] Syncing BaseContract...');
        const baseAbi = [{ "inputs": [{ "internalType": "address", "name": "_resourceVault", "type": "address" }], "name": "setResourceVault", "outputs": [], "stateMutability": "nonpayable", "type": "function" }];
        let tx = await client.writeContract({ address: BASE_CONTRACT, abi: baseAbi, functionName: 'setResourceVault', args: [NEW_VAULT] });
        await client.waitForTransactionReceipt({ hash: tx });
        console.log('✅ BaseContract pointer updated.');

        // STEP 4b: PvPArena.setResourceVault
        console.log('\n[STEP 4b] Syncing PvPArena...');
        const arenaAbi = [{ "inputs": [{ "internalType": "address", "name": "_vault", "type": "address" }], "name": "setResourceVault", "outputs": [], "stateMutability": "nonpayable", "type": "function" }];
        tx = await client.writeContract({ address: PVP_ARENA, abi: arenaAbi, functionName: 'setResourceVault', args: [NEW_VAULT] });
        await client.waitForTransactionReceipt({ hash: tx });
        console.log('✅ PvPArena pointer updated.');

        // STEP 4c: emergencySeed(WALLET_1)
        console.log(`\n[STEP 4c] Seeding Wallet 1 (${WALLET_1})...`);
        tx = await client.writeContract({ address: NEW_VAULT, abi: vaultAbi, functionName: 'emergencySeed', args: [WALLET_1] });
        await client.waitForTransactionReceipt({ hash: tx });
        console.log('✅ Wallet 1 seeded.');

        // STEP 4d: emergencySeed(WALLET_2)
        console.log(`\n[STEP 4d] Seeding Wallet 2 (${WALLET_2})...`);
        tx = await client.writeContract({ address: NEW_VAULT, abi: vaultAbi, functionName: 'emergencySeed', args: [WALLET_2] });
        await client.waitForTransactionReceipt({ hash: tx });
        console.log('✅ Wallet 2 seeded.');

        console.log(`\n--- SEQUENCE COMPLETE: SUCCESS ✅ ---`);
        console.log(`NEW_RESOURCE_VAULT: ${NEW_VAULT}`);

    } catch (e) {
        console.error(`\n❌ FATAL ERROR IN SEQUENCE:`, e.shortMessage || e.message);
        process.exit(1);
    }
}

main();
