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

const PVP_ARENA = '0x67097c8e6be1f1bd8b8094353ac4e7b8cd137b01';
const RESOURCE_VAULT = '0xa737c12dc5291cd67715e1cb5e0b04cfeb70ab3d';
const ACCOUNT = '0x71708D8171F0Af75b0184861906B3678f7337E50';

const PVP_ARENA_ABI = [
  {
    name: 'getActiveBattleForAttacker',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'attacker', type: 'address' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'id', type: 'uint256' },
        { name: 'attacker', type: 'address' },
        { name: 'defender', type: 'address' },
        { name: 'status', type: 'uint8' },
        { name: 'attackerWon', type: 'bool' },
        { name: 'attackerPower', type: 'uint32' },
        { name: 'defenderPower', type: 'uint32' },
        { name: 'lootCredits', type: 'uint64' },
        { name: 'lootBiomass', type: 'uint64' },
        { name: 'lootMinera', type: 'uint64' },
        { name: 'createdAt', type: 'uint40' },
        { name: 'resolvedAt', type: 'uint40' },
        { name: 'entropySequence', type: 'uint64' },
        { name: 'entropyCommit', type: 'bytes32' },
        { name: 'attackerEmpire', type: 'string' },
        { name: 'defenderEmpire', type: 'string' }
      ]
    }]
  },
  {
    name: 'resolveBattle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'battleId', type: 'uint256' }],
    outputs: []
  }
];

const RESOURCE_VAULT_ABI = [
  {
    name: 'getLootableResources',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [
      { name: 'lootableCredits', type: 'uint64' },
      { name: 'lootableBiomass', type: 'uint64' },
      { name: 'lootableMinera', type: 'uint64' }
    ]
  },
  {
    name: 'vaults',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [
        { name: 'credits', type: 'uint64' },
        { name: 'biomass', type: 'uint64' },
        { name: 'minera', type: 'uint64' },
        { name: 'vanguard', type: 'uint64' },
        { name: 'lastTickAt', type: 'uint40' },
        { name: 'vaultCredits', type: 'uint64' },
        { name: 'vaultBiomass', type: 'uint64' },
        { name: 'vaultMinera', type: 'uint64' }
    ]
  }
];

async function run() {
  console.log('--- STARTING DIAGNOSTIC SIMULATION ---');
  console.log('Target Wallet:', ACCOUNT);

  // 1. Get Active Battle
  let battle;
  try {
    battle = await client.readContract({
      address: PVP_ARENA,
      abi: PVP_ARENA_ABI,
      functionName: 'getActiveBattleForAttacker',
      args: [ACCOUNT],
    });
    console.log('\n--- ACTIVE BATTLE STRUCT ---');
    console.log(JSON.stringify(battle, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
    
    if (battle.id === 0n) {
      console.log('No active battle found for this account.');
      return;
    }
  } catch (err) {
    console.error('Failed to fetch active battle:', err.message);
    return;
  }

  const defender = battle.defender;
  console.log('\nDefender Address:', defender);

  // 2. Simulate resolveBattle
  console.log('\n--- SIMULATING resolveBattle ---');
  try {
    const result = await client.simulateContract({
      address: PVP_ARENA,
      abi: PVP_ARENA_ABI,
      functionName: 'resolveBattle',
      args: [battle.id],
      account: ACCOUNT,
    });
    console.log('Simulation SUCCESSFUL! The call would succeed if sent.');
  } catch (err) {
    console.log('Simulation FAILED.');
    console.log('--- DETAILED ERROR TRACING ---');
    console.log('Message:', err.message);
    if (err.cause) console.log('Cause:', err.cause);
    if (err.data) console.log('Raw Data:', err.data);
    console.log('\nFull Error Object:', JSON.stringify(err, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
  }

  // 3. ResourceVault Checks
  console.log('\n--- RESOURCE VAULT SUB-CALLS ---');
  
  try {
    const lootable = await client.readContract({
      address: RESOURCE_VAULT,
      abi: RESOURCE_VAULT_ABI,
      functionName: 'getLootableResources',
      args: [defender],
    });
    console.log('getLootableResources(defender):', lootable);
  } catch (err) {
    console.error('getLootableResources FAILED:', err.message);
  }

  try {
    const vault = await client.readContract({
      address: RESOURCE_VAULT,
      abi: RESOURCE_VAULT_ABI,
      functionName: 'vaults',
      args: [defender],
    });
    console.log('\nvaults(defender) Struct:');
    console.log(JSON.stringify(vault, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
  } catch (err) {
    console.error('vaults call FAILED:', err.message);
  }
  
  console.log('\n--- DIAGNOSTIC COMPLETE ---');
}

run().catch(console.error);
