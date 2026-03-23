const fs = require('fs');
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
const publicClient = createPublicClient({ transport: http(rpcUrl) });

const ADDR = {
    BASE: '0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66',
    VAULT: '0xa737c12dc5291cd67715e1cb5e0b04cfeb70ab3d',
    ARENA: '0x67097c8e6be1f1bd8b8094353ac4e7b8cd137b01',
    LEADERBOARD: '0x95396246b715Ff6a7Db39040E9be43Bdb5701b0b',
    REGISTRY: '0x1d617cC33411562c0c25Ce35A1B6F08E92d74916',
    WALLET_1: '0x71708D8171F0Af75b0184861906B3678f7337E50',
    WALLET_2: '0xF9F2393673c1B4c16Eb53ca7e37A5CAf653Bb13e'
};

async function fix() {
    console.log('--- RECTIFYING RESOURCEVAULT POINTER ---');
    const vaultAbi = [{ "inputs": [{ "internalType": "address", "name": "_arena", "type": "address" }], "name": "setPvPArena", "outputs": [], "stateMutability": "nonpayable", "type": "function" }];
    
    try {
        const tx = await client.writeContract({
            address: ADDR.VAULT,
            abi: vaultAbi,
            functionName: 'setPvPArena',
            args: [ADDR.ARENA]
        });
        console.log(`setPvPArena Tx: ${tx}`);
        await client.waitForTransactionReceipt({ hash: tx });
        console.log('✅ ResourceVault.pvpArena synchronized.');
    } catch (e) {
        console.error('❌ Failed to set arena:', e.message);
    }
}

async function runHealthCheck() {
    console.log('\n--- FINAL PROTOCOL HEALTH AUDIT: PHASE 29 ---');
    let issues = 0;

    const ABIS = {
        BASE: [{ name: "resourceVault", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" }, { name: "hasBase", type: "function", inputs: [{ type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" }],
        VAULT: [{ name: "baseContract", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" }, { name: "pvpArena", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" }, { name: "vaults", type: "function", inputs: [{ type: "address" }], outputs: [{ name: "credits", type: "uint64" }, { name: "biomass", type: "uint64" }, { name: "minera", type: "uint64" }, { name: "vanguard", type: "uint64" }], stateMutability: "view" }],
        ARENA: [{ name: "baseContract", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" }, { name: "leaderboard", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" }, { name: "resourceVault", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" }, { name: "empireRegistry", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" }],
        LEADERBOARD: [{ name: "pvpArena", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" }],
        REGISTRY: [{ name: "hasEmpire", type: "function", inputs: [{ type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" }]
    };

    function verify(label, actual, expected) {
        const pass = (actual || '').toLowerCase() === expected.toLowerCase();
        if (!pass) issues++;
        console.log(`[${pass ? 'PASS' : 'FAIL'}] ${label}: got ${actual} (expected ${expected})`);
    }

    // BASE
    const v1 = await publicClient.readContract({ address: ADDR.BASE, abi: ABIS.BASE, functionName: 'resourceVault' });
    verify('BASECONTRACT.resourceVault', v1, ADDR.VAULT);

    // VAULT
    const v2_b = await publicClient.readContract({ address: ADDR.VAULT, abi: ABIS.VAULT, functionName: 'baseContract' });
    const v2_a = await publicClient.readContract({ address: ADDR.VAULT, abi: ABIS.VAULT, functionName: 'pvpArena' });
    verify('RESOURCEVAULT.baseContract', v2_b, ADDR.BASE);
    verify('RESOURCEVAULT.pvpArena', v2_a, ADDR.ARENA);

    // ARENA
    const v3_b = await publicClient.readContract({ address: ADDR.ARENA, abi: ABIS.ARENA, functionName: 'baseContract' });
    const v3_l = await publicClient.readContract({ address: ADDR.ARENA, abi: ABIS.ARENA, functionName: 'leaderboard' });
    const v3_v = await publicClient.readContract({ address: ADDR.ARENA, abi: ABIS.ARENA, functionName: 'resourceVault' });
    const v3_r = await publicClient.readContract({ address: ADDR.ARENA, abi: ABIS.ARENA, functionName: 'empireRegistry' });
    verify('PVPARENA.baseContract', v3_b, ADDR.BASE);
    verify('PVPARENA.leaderboard', v3_l, ADDR.LEADERBOARD);
    verify('PVPARENA.resourceVault', v3_v, ADDR.VAULT);
    verify('PVPARENA.empireRegistry', v3_r, ADDR.REGISTRY);

    // LEADERBOARD
    const v4_a = await publicClient.readContract({ address: ADDR.LEADERBOARD, abi: ABIS.LEADERBOARD, functionName: 'pvpArena' });
    verify('LEADERBOARD.pvpArena', v4_a, ADDR.ARENA);

    console.log('\n--- LIVE FUNCTIONAL TESTS ---');
    const w1 = await publicClient.readContract({ address: ADDR.VAULT, abi: ABIS.VAULT, functionName: 'vaults', args: [ADDR.WALLET_1] });
    console.log(`Wallet 1 Resources: C:${w1[0]} B:${w1[1]} M:${w1[2]} V:${w1[3]}`);
    console.log(`  hasBase:   ${await publicClient.readContract({ address: ADDR.BASE, abi: ABIS.BASE, functionName: 'hasBase', args: [ADDR.WALLET_1] })}`);
    console.log(`  hasEmpire: ${await publicClient.readContract({ address: ADDR.REGISTRY, abi: ABIS.REGISTRY, functionName: 'hasEmpire', args: [ADDR.WALLET_1] })}`);

    const w2 = await publicClient.readContract({ address: ADDR.VAULT, abi: ABIS.VAULT, functionName: 'vaults', args: [ADDR.WALLET_2] });
    console.log(`Wallet 2 Resources: C:${w2[0]} B:${w2[1]} M:${w2[2]} V:${w2[3]}`);
    console.log(`  hasBase:   ${await publicClient.readContract({ address: ADDR.BASE, abi: ABIS.BASE, functionName: 'hasBase', args: [ADDR.WALLET_2] })}`);
    console.log(`  hasEmpire: ${await publicClient.readContract({ address: ADDR.REGISTRY, abi: ABIS.REGISTRY, functionName: 'hasEmpire', args: [ADDR.WALLET_2] })}`);

    console.log('\n----------------------------------------');
    console.log(issues === 0 ? 'SYSTEM STATUS: HEALTHY' : `SYSTEM STATUS: ISSUES FOUND (${issues} errors)`);
}

async function main() {
    await fix();
    await runHealthCheck();
}

main();
