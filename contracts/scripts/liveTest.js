const { createPublicClient, http } = require('C:\\Users\\dell\\Documents\\VS_code\\dreamsiege\\frontend\\node_modules\\viem\\_cjs\\index.js');

const client = createPublicClient({
  transport: http('https://dream-rpc.somnia.network')
});

const ARENA = '0x004c763938cbf60ad358e477a4c79aa8e01c755d';
const BASE = '0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66';
const EMPIRE = '0x1d617cC33411562c0c25Ce35A1B6F08E92d74916';

const WALLET1 = '0x71708D8171F0Af75b0184861906B3678f7337E50';
const WALLET2 = '0xF9F2393673c1B4c16Eb53ca7e37A5CAf653Bb13e';

const baseAbi = [{ name: 'hasBase', type: 'function', stateMutability: 'view', inputs: [{ name: 'player', type: 'address' }], outputs: [{ type: 'bool' }] }];
const empireAbi = [{ name: 'hasEmpire', type: 'function', stateMutability: 'view', inputs: [{ name: 'player', type: 'address' }], outputs: [{ type: 'bool' }] }];
const arenaAbi = [
  { name: 'getWinChance', type: 'function', stateMutability: 'view', inputs: [{ name: 'attacker', type: 'address' }, { name: 'defender', type: 'address' }], outputs: [{ type: 'uint8' }] },
  { name: 'isOnCooldown', type: 'function', stateMutability: 'view', inputs: [{ name: 'player', type: 'address' }], outputs: [{ type: 'bool' }] }
];

async function main() {
  console.log('--- FUNCTIONAL LIVE TEST ---');

  async function test(label, promise, validate) {
    try {
      const res = await promise;
      const passed = validate(res);
      console.log(`[${passed ? 'PASS' : 'FAIL'}] ${label} -> ${res}`);
      if (!passed) console.log(`   Expected condition failed.`);
    } catch (e) {
      console.log(`[FAIL] ${label}`);
      console.log(`   Error: ${e.shortMessage || e.message}`);
    }
  }

  // 1. hasBase
  await test('baseContract.hasBase(Wallet1)', client.readContract({ address: BASE, abi: baseAbi, functionName: 'hasBase', args: [WALLET1] }), r => r === true);
  await test('baseContract.hasBase(Wallet2)', client.readContract({ address: BASE, abi: baseAbi, functionName: 'hasBase', args: [WALLET2] }), r => r === true);

  // 2. hasEmpire
  await test('empireRegistry.hasEmpire(Wallet1)', client.readContract({ address: EMPIRE, abi: empireAbi, functionName: 'hasEmpire', args: [WALLET1] }), r => r === true);
  await test('empireRegistry.hasEmpire(Wallet2)', client.readContract({ address: EMPIRE, abi: empireAbi, functionName: 'hasEmpire', args: [WALLET2] }), r => r === true);

  // 3. getWinChance
  await test('PvPArena.getWinChance(Wallet1, Wallet2)', client.readContract({ address: ARENA, abi: arenaAbi, functionName: 'getWinChance', args: [WALLET1, WALLET2] }), r => r >= 10 && r <= 90);

  // 4. isOnCooldown
  await test('PvPArena.isOnCooldown(Wallet1)', client.readContract({ address: ARENA, abi: arenaAbi, functionName: 'isOnCooldown', args: [WALLET1] }), r => r === false);
  await test('PvPArena.isOnCooldown(Wallet2)', client.readContract({ address: ARENA, abi: arenaAbi, functionName: 'isOnCooldown', args: [WALLET2] }), r => r === false);

}

main().catch(console.error);
