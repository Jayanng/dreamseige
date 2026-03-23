const fs = require('fs');
const { createWalletClient, http, publicActions } = require('C:\\Users\\dell\\Documents\\VS_code\\dreamsiege\\frontend\\node_modules\\viem\\_cjs\\index.js');
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
const NEW_VAULT = '0x69720c73a855996a32ed590e64536c77095d2f77';

const abi = [
    { "inputs": [{ "internalType": "address", "name": "_resourceVault", "type": "address" }], "name": "setResourceVault", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

async function fix() {
    console.log(`\n--- Fixing BaseContract ResourceVault Pointer ---`);
    console.log(`BaseContract: ${BASE_CONTRACT}`);
    console.log(`New Vault:    ${NEW_VAULT}`);

    try {
        const hash = await client.writeContract({
            address: BASE_CONTRACT,
            abi: abi,
            functionName: 'setResourceVault',
            args: [NEW_VAULT]
        });
        console.log(`Fix Tx Sent: ${hash}`);
        await client.waitForTransactionReceipt({ hash });
        console.log(`✅ BaseContract successfully synchronized!`);
    } catch (e) {
        console.error(`❌ Fix Failed:`, e.shortMessage || e.message);
    }
}

fix();
