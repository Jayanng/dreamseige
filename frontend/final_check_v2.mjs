import { createPublicClient, http, defineChain } from 'viem';

const somniaTestnet = defineChain({
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://dream-rpc.somnia.network"] },
    public:  { http: ["https://dream-rpc.somnia.network"] },
  },
  testnet: true,
});

const client = createPublicClient({
  chain: somniaTestnet,
  transport: http(),
});

const PVP_ARENA = '0xc16548ee3533c0653e6fb256db8ef61278816bed';
const RESOURCE_VAULT = '0xa737c12dc5291cd67715e1cb5e0b04cfeb70ab3d';
const LEADERBOARD = '0x95396246b715Ff6a7Db39040E9be43Bdb5701b0b';
const BASE_CONTRACT = '0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66';
const EMPIRE_REGISTRY = '0x1d617cC33411562c0c25Ce35A1B6F08E92d74916';

async function check() {
  console.log('--- ARCHITECTURE CHECK (SOMNIA TESTNET) ---');

  const pvpAbi = [
    { name: 'baseContract', type: 'function', inputs: [], outputs: [{ type: 'address' }] },
    { name: 'leaderboard', type: 'function', inputs: [], outputs: [{ type: 'address' }] },
    { name: 'resourceVault', type: 'function', inputs: [], outputs: [{ type: 'address' }] },
    { name: 'empireRegistry', type: 'function', inputs: [], outputs: [{ type: 'address' }] },
    { name: 'challengeExpiry', type: 'function', inputs: [], outputs: [{ type: 'uint40' }] },
  ];

  const vaultAbi = [
    { name: 'pvpArena', type: 'function', inputs: [], outputs: [{ type: 'address' }] },
  ];

  const leaderboardAbi = [
    { name: 'pvpArena', type: 'function', inputs: [], outputs: [{ type: 'address' }] },
  ];

  const results = [];

  const checkValue = (label, actual, expected) => {
    const pass = String(actual).toLowerCase() === String(expected).toLowerCase();
    results.push({ label, actual, expected, status: pass ? 'PASS' : 'FAIL' });
  };

  // 1. PvP Arena Checks
  try {
    const base = await client.readContract({ address: PVP_ARENA, abi: pvpAbi, functionName: 'baseContract' });
    checkValue('PvPArena.baseContract', base, BASE_CONTRACT);

    const leader = await client.readContract({ address: PVP_ARENA, abi: pvpAbi, functionName: 'leaderboard' });
    checkValue('PvPArena.leaderboard', leader, LEADERBOARD);

    const vault = await client.readContract({ address: PVP_ARENA, abi: pvpAbi, functionName: 'resourceVault' });
    checkValue('PvPArena.resourceVault', vault, RESOURCE_VAULT);

    const registry = await client.readContract({ address: PVP_ARENA, abi: pvpAbi, functionName: 'empireRegistry' });
    checkValue('PvPArena.empireRegistry', registry, EMPIRE_REGISTRY);

    const expiry = await client.readContract({ address: PVP_ARENA, abi: pvpAbi, functionName: 'challengeExpiry' });
    checkValue('PvPArena.challengeExpiry', expiry, 600);
  } catch (e) {
    console.error('PvPArena checks failed:', e.message);
  }

  // 2. ResourceVault Checks
  try {
    const arenaInVault = await client.readContract({ address: RESOURCE_VAULT, abi: vaultAbi, functionName: 'pvpArena' });
    checkValue('ResourceVault.pvpArena', arenaInVault, PVP_ARENA);
  } catch (e) {
    console.error('ResourceVault checks failed:', e.message);
  }

  // 3. Leaderboard Checks
  try {
    const arenaInLeader = await client.readContract({ address: LEADERBOARD, abi: leaderboardAbi, functionName: 'pvpArena' });
    checkValue('Leaderboard.pvpArena', arenaInLeader, PVP_ARENA);
  } catch (e) {
    console.error('Leaderboard checks failed:', e.message);
  }

  // PRINT SUMMARY
  console.table(results);

  const allPass = results.every(r => r.status === 'PASS');
  console.log(`\nOVERALL STATUS: ${allPass ? 'SUCCESS ✅' : 'FAILED ❌'}`);
}

check().catch(console.error);
