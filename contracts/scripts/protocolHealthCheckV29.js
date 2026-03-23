const { createPublicClient, http } = require('C:\\Users\\dell\\Documents\\VS_code\\dreamsiege\\frontend\\node_modules\\viem\\_cjs\\index.js');

const rpcUrl = 'https://dream-rpc.somnia.network';
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

const ABIS = {
    BASE: [
        { name: "resourceVault", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
        { name: "hasBase", type: "function", inputs: [{ type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" }
    ],
    VAULT: [
        { name: "baseContract", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
        { name: "pvpArena", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
        { name: "vaults", type: "function", inputs: [{ type: "address" }], outputs: [
            { name: "credits", type: "uint64" },
            { name: "biomass", type: "uint64" },
            { name: "minera", type: "uint64" },
            { name: "vanguard", type: "uint64" },
            { name: "lastTickAt", type: "uint40" },
            { name: "vaultCredits", type: "uint64" },
            { name: "vaultBiomass", type: "uint64" },
            { name: "vaultMinera", type: "uint64" }
        ], stateMutability: "view" }
    ],
    ARENA: [
        { name: "baseContract", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
        { name: "leaderboard", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
        { name: "resourceVault", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
        { name: "empireRegistry", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" }
    ],
    LEADERBOARD: [
        { name: "arena", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" }
    ],
    REGISTRY: [
        { name: "hasEmpire", type: "function", inputs: [{ type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" }
    ]
};

async function check() {
    console.log('--- PROTOCOL HEALTH AUDIT: PHASE 29 ---');
    let issues = 0;

    function verify(label, actual, expected) {
        const pass = (actual || '').toLowerCase() === expected.toLowerCase();
        if (!pass) issues++;
        console.log(`[${pass ? 'PASS' : 'FAIL'}] ${label}: got ${actual} (expected ${expected})`);
    }

    // 1. BASECONTRACT
    try {
        const v = await publicClient.readContract({ address: ADDR.BASE, abi: ABIS.BASE, functionName: 'resourceVault' });
        verify('BASECONTRACT.resourceVault', v, ADDR.VAULT);
    } catch (e) { console.log(`[FAIL] BASECONTRACT: ${e.message}`); issues++; }

    // 2. RESOURCEVAULT
    try {
        const b = await publicClient.readContract({ address: ADDR.VAULT, abi: ABIS.VAULT, functionName: 'baseContract' });
        const a = await publicClient.readContract({ address: ADDR.VAULT, abi: ABIS.VAULT, functionName: 'pvpArena' });
        verify('RESOURCEVAULT.baseContract', b, ADDR.BASE);
        verify('RESOURCEVAULT.arena', a, ADDR.ARENA);
    } catch (e) { console.log(`[FAIL] RESOURCEVAULT: ${e.message}`); issues++; }

    // 3. PVPARENA
    try {
        const b = await publicClient.readContract({ address: ADDR.ARENA, abi: ABIS.ARENA, functionName: 'baseContract' });
        const l = await publicClient.readContract({ address: ADDR.ARENA, abi: ABIS.ARENA, functionName: 'leaderboard' });
        const v = await publicClient.readContract({ address: ADDR.ARENA, abi: ABIS.ARENA, functionName: 'resourceVault' });
        const r = await publicClient.readContract({ address: ADDR.ARENA, abi: ABIS.ARENA, functionName: 'empireRegistry' });
        verify('PVPARENA.baseContract', b, ADDR.BASE);
        verify('PVPARENA.leaderboard', l, ADDR.LEADERBOARD);
        verify('PVPARENA.resourceVault', v, ADDR.VAULT);
        verify('PVPARENA.empireRegistry', r, ADDR.REGISTRY);
    } catch (e) { console.log(`[FAIL] PVPARENA: ${e.message}`); issues++; }

    // 4. LEADERBOARD
    try {
        const a = await publicClient.readContract({ address: ADDR.LEADERBOARD, abi: ABIS.LEADERBOARD, functionName: 'arena' });
        verify('LEADERBOARD.arena', a, ADDR.ARENA);
    } catch (e) { console.log(`[FAIL] LEADERBOARD: ${e.message}`); issues++; }

    console.log('\n--- LIVE FUNCTIONAL TESTS ---');

    async function testWallet(label, wallet) {
        console.log(`\nTesting ${label} (${wallet}):`);
        try {
            const v = await publicClient.readContract({ address: ADDR.VAULT, abi: ABIS.VAULT, functionName: 'vaults', args: [wallet] });
            console.log(`  Resources: C:${v[0]} B:${v[1]} M:${v[2]} V:${v[3]}`);
            
            const b = await publicClient.readContract({ address: ADDR.BASE, abi: ABIS.BASE, functionName: 'hasBase', args: [wallet] });
            console.log(`  hasBase:   ${b}`);
            
            const r = await publicClient.readContract({ address: ADDR.REGISTRY, abi: ABIS.REGISTRY, functionName: 'hasEmpire', args: [wallet] });
            console.log(`  hasEmpire: ${r}`);
        } catch (e) { console.log(`  [ERROR]: ${e.message}`); }
    }

    await testWallet('Wallet 1', ADDR.WALLET_1);
    await testWallet('Wallet 2', ADDR.WALLET_2);

    console.log('\n----------------------------------------');
    if (issues === 0) {
        console.log('SYSTEM STATUS: HEALTHY');
    } else {
        console.log(`SYSTEM STATUS: ISSUES FOUND (${issues} errors)`);
    }
}

check();
