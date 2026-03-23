const fs = require('fs');
const path = require('path');
const { createPublicClient, http } = require('C:\\Users\\dell\\Documents\\VS_code\\dreamsiege\\frontend\\node_modules\\viem\\_cjs\\index.js');

const client = createPublicClient({
  transport: http('https://dream-rpc.somnia.network')
});

const ARENA = '0x004c763938cbf60ad358e477a4c79aa8e01c755d'.toLowerCase();
const BASE = '0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66'.toLowerCase();
const LEADERBOARD = '0x95396246b715Ff6a7Db39040E9be43Bdb5701b0b'.toLowerCase();
const VAULT = '0x714256500e5b48836b823DF82c5F4CC2A8E88B55'.toLowerCase();
const EMPIRE = '0x1d617cC33411562c0c25Ce35A1B6F08E92d74916'.toLowerCase();

const arenaAbi = [
  { name: 'baseContract', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'leaderboard', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'resourceVault', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'empireRegistry', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] }
];

const hubAbi = [
  { name: 'pvpArena', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
];

async function main() {
  console.log('--- FINAL ARCHITECTURE CHECK ---');
  let allPass = true;

  function check(label, actual, expected) {
    const isPass = actual.toLowerCase() === expected.toLowerCase();
    console.log(`[${isPass ? 'PASS' : 'FAIL'}] ${label}`);
    if (!isPass) {
        console.log(`   Expected: ${expected}`);
        console.log(`   Actual:   ${actual}`);
        allPass = false;
    }
  }

  try {
    const baseC = await client.readContract({ address: ARENA, abi: arenaAbi, functionName: 'baseContract' });
    check('PvPArena.baseContract', baseC, BASE);

    const leadId = await client.readContract({ address: ARENA, abi: arenaAbi, functionName: 'leaderboard' });
    check('PvPArena.leaderboard', leadId, LEADERBOARD);

    const vaultX = await client.readContract({ address: ARENA, abi: arenaAbi, functionName: 'resourceVault' });
    check('PvPArena.resourceVault', vaultX, VAULT);

    const empId = await client.readContract({ address: ARENA, abi: arenaAbi, functionName: 'empireRegistry' });
    check('PvPArena.empireRegistry', empId, EMPIRE);

    const vaultArena = await client.readContract({ address: VAULT, abi: hubAbi, functionName: 'pvpArena' });
    check('ResourceVault.arena', vaultArena, ARENA);

    const leaderArena = await client.readContract({ address: LEADERBOARD, abi: hubAbi, functionName: 'pvpArena' });
    check('LeaderboardContract.arena', leaderArena, ARENA);

    const contractsPath = path.resolve(__dirname, '../../frontend/src/constants/contracts.ts');
    const content = fs.readFileSync(contractsPath, 'utf8');
    const pvpMatch = content.match(/PVP_ARENA:\s*'([^']+)'/);
    if (pvpMatch && pvpMatch[1]) {
        check('contracts.ts PVP_ARENA', pvpMatch[1], ARENA);
    } else {
        console.log('[FAIL] contracts.ts PVP_ARENA (regex failed)');
        allPass = false;
    }

    console.log(`\n${allPass ? 'ALL CHECKS PASSED ✅' : 'SOME CHECKS FAILED ❌'}`);

  } catch (e) {
    console.error('Error during check:', e.shortMessage || e.message);
  }
}

main().catch(console.error);
