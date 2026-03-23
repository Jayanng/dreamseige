const fs = require('fs');
const path = require('path');
const { createPublicClient, http } = require('C:\\Users\\dell\\Documents\\VS_code\\dreamsiege\\frontend\\node_modules\\viem\\_cjs\\index.js');

const rpcUrl = 'https://dream-rpc.somnia.network';
const publicClient = createPublicClient({ transport: http(rpcUrl) });

const ARENA = '0x67097c8e6be1f1bd8b8094353ac4e7b8cd137b01';
const BASE = '0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66';
const LEADERBOARD = '0x95396246b715Ff6a7Db39040E9be43Bdb5701b0b';
const VAULT = '0x69720c73a855996a32ed590e64536c77095d2f77';
const EMPIRE = '0x1d617cC33411562c0c25Ce35A1B6F08E92d74916';

const arenaAbi = [
    { name: "baseContract", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
    { name: "leaderboard", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
    { name: "resourceVault", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
    { name: "empireRegistry", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" }
];

const hubAbi = [
    { name: "pvpArena", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" }
];

async function check() {
    console.log('--- FINAL ARCHITECTURE CHECK: SOMNIA TESTNET ---');
    console.log(`Checking Arena at: ${ARENA}\n`);

    let allPass = true;

    async function verify(name, contract, abi, func, expected) {
        try {
            const actual = await publicClient.readContract({
                address: contract,
                abi: abi,
                functionName: func
            });
            const pass = actual.toLowerCase() === expected.toLowerCase();
            console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}: expected ${expected}, got ${actual}`);
            if (!pass) allPass = false;
        } catch (e) {
            console.log(`[FAIL] ${name}: Error reading ${func} - ${e.message}`);
            allPass = false;
        }
    }

    // 1. PvPArena Mappings
    await verify('Arena -> BaseContract', ARENA, arenaAbi, 'baseContract', BASE);
    await verify('Arena -> Leaderboard', ARENA, arenaAbi, 'leaderboard', LEADERBOARD);
    await verify('Arena -> ResourceVault', ARENA, arenaAbi, 'resourceVault', VAULT);
    await verify('Arena -> EmpireRegistry', ARENA, arenaAbi, 'empireRegistry', EMPIRE);

    // 2. ResourceVault -> Arena
    await verify('ResourceVault -> Arena', VAULT, hubAbi, 'pvpArena', ARENA);

    // 3. Leaderboard -> Arena
    await verify('Leaderboard -> Arena', LEADERBOARD, hubAbi, 'pvpArena', ARENA);

    // 4. contracts.ts Check
    try {
        const contractsTs = fs.readFileSync(path.join(__dirname, '../../frontend/src/constants/contracts.ts'), 'utf8');
        const pass = contractsTs.includes(ARENA);
        console.log(`[${pass ? 'PASS' : 'FAIL'}] contracts.ts: contains ${ARENA}`);
        if (!pass) allPass = false;
    } catch (e) {
        console.log(`[FAIL] contracts.ts: Error reading file - ${e.message}`);
        allPass = false;
    }

    console.log(`\n--- RESULT: ${allPass ? 'SUCCESS ✅' : 'FAIL ❌'} ---`);
    process.exit(allPass ? 0 : 1);
}

check();
