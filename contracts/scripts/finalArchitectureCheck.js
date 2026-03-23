const fs = require('fs');
const path = require('path');
const { createPublicClient, http } = require('C:\\Users\\dell\\Documents\\VS_code\\dreamsiege\\frontend\\node_modules\\viem\\_cjs\\index.js');

const client = createPublicClient({
  transport: http('https://dream-rpc.somnia.network')
});

const ARENA = '0xde2241b2db44454c1b174fab7bc5e40bbab6dd2c'.toLowerCase();
const BASE = '0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66'.toLowerCase();
const LEADERBOARD = '0x95396246b715Ff6a7Db39040E9be43Bdb5701b0b'.toLowerCase();
const VAULT = '0x714256500e5b48836b823DF82c5F4CC2A8E88B55'.toLowerCase();
const EMPIRE = '0x1d617cC33411562c0c25Ce35A1B6F08E92d74916'.toLowerCase();

const WALLET1 = '0x71708D8171F0Af75b0184861906B3678f7337E50';
const WALLET2 = '0xF9F2393673c1B4c16Eb53ca7e37A5CAf653Bb13e';

const arenaAbi = [
  { name: 'baseContract', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'leaderboard', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'resourceVault', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'empireRegistry', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] }
];

const hubAbi = [
  { name: 'pvpArena', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
];

const baseAbi = [{ name: 'hasBase', type: 'function', stateMutability: 'view', inputs: [{ name: 'player', type: 'address' }], outputs: [{ type: 'bool' }] }];
const empireAbi = [{ name: 'hasEmpire', type: 'function', stateMutability: 'view', inputs: [{ name: 'player', type: 'address' }], outputs: [{ type: 'bool' }] }];

async function main() {
  console.log('--- FINAL ARCHITECTURE & FUNCTIONAL CHECK ---\n');
  let allPass = true;

  async function checkAddress(label, contract, abi, func, expected) {
    try {
        const val = await client.readContract({ address: contract, abi, functionName: func });
        const pass = val.toLowerCase() === expected.toLowerCase();
        console.log(`[${pass ? 'PASS' : 'FAIL'}] ${label}`);
        if (!pass) {
            console.log(`   Expected: ${expected}\n   Actual:   ${val}`);
            allPass = false;
        }
    } catch (e) {
        console.log(`[FAIL] ${label}\n   Error: ${e.shortMessage || e.message}`);
        allPass = false;
    }
  }

  async function checkBool(label, contract, abi, func, args, expected) {
    try {
        const val = await client.readContract({ address: contract, abi, functionName: func, args });
        const pass = val === expected;
        console.log(`[${pass ? 'PASS' : 'FAIL'}] ${label}`);
        if (!pass) {
            console.log(`   Expected: ${expected}\n   Actual:   ${val}`);
            allPass = false;
        }
    } catch (e) {
        console.log(`[FAIL] ${label}\n   Error: ${e.shortMessage || e.message}`);
        allPass = false;
    }
  }

  // 1. PvPArena
  await checkAddress('PvPArena.baseContract', ARENA, arenaAbi, 'baseContract', BASE);
  await checkAddress('PvPArena.leaderboard', ARENA, arenaAbi, 'leaderboard', LEADERBOARD);
  await checkAddress('PvPArena.resourceVault', ARENA, arenaAbi, 'resourceVault', VAULT);
  await checkAddress('PvPArena.empireRegistry', ARENA, arenaAbi, 'empireRegistry', EMPIRE);

  // 2. ResourceVault
  await checkAddress('ResourceVault.arena', VAULT, hubAbi, 'pvpArena', ARENA);

  // 3. LeaderboardContract
  await checkAddress('LeaderboardContract.arena', LEADERBOARD, hubAbi, 'pvpArena', ARENA);

  // 4. contracts.ts
  try {
      const contractsPath = path.resolve(__dirname, '../../frontend/src/constants/contracts.ts');
      const content = fs.readFileSync(contractsPath, 'utf8');
      const pvpMatch = content.match(/PVP_ARENA:\s*'([^']+)'/);
      const pass = pvpMatch && pvpMatch[1].toLowerCase() === ARENA;
      console.log(`[${pass ? 'PASS' : 'FAIL'}] contracts.ts PVP_ARENA value`);
      if (!pass) {
        console.log(`   Expected: ${ARENA}\n   Actual:   ${pvpMatch ? pvpMatch[1] : 'not found'}`);
        allPass = false;
      }
  } catch(e) {
      console.log(`[FAIL] contracts.ts PVP_ARENA value\n   Error: ${e.message}`);
      allPass = false;
  }

  console.log('\n--- LIVE FUNCTIONAL TESTS ---');
  // 5. Live functional test
  await checkBool(`baseContract.hasBase(${WALLET1})`, BASE, baseAbi, 'hasBase', [WALLET1], true);
  await checkBool(`baseContract.hasBase(${WALLET2})`, BASE, baseAbi, 'hasBase', [WALLET2], true);
  await checkBool(`empireRegistry.hasEmpire(${WALLET1})`, EMPIRE, empireAbi, 'hasEmpire', [WALLET1], true);
  await checkBool(`empireRegistry.hasEmpire(${WALLET2})`, EMPIRE, empireAbi, 'hasEmpire', [WALLET2], true);

  console.log(`\n${allPass ? 'SUMMARY: ALL CHECKS PASSED ✅' : 'SUMMARY: SOME CHECKS FAILED ❌'}`);
}

main().catch(console.error);
