import { createPublicClient, http, parseAbi } from 'viem';
import { somniaTestnet } from 'viem/chains';

const PVP_ARENA_ADDRESS = '0x67097c8e6be1f1bd8b8094353ac4e7b8cd137b01';
const ATTACKER_ADDRESS = '0x71708D8171F0Af75b0184861906B3678f7337E50';

const PVP_ARENA_ABI = parseAbi([
  'function getActiveBattleForAttacker(address attacker) view returns ((uint256 id, address attacker, address defender, uint8 status, bool attackerWon, uint32 attackerPower, uint32 defenderPower, uint64 lootCredits, uint64 lootBiomass, uint64 lootMinera, uint40 createdAt, uint40 resolvedAt, uint64 entropySequence, bytes32 entropyCommit, string attackerEmpire, string defenderEmpire))',
  'function getBattle(uint256 battleId) view returns ((uint256 id, address attacker, address defender, uint8 status, bool attackerWon, uint32 attackerPower, uint32 defenderPower, uint64 lootCredits, uint64 lootBiomass, uint64 lootMinera, uint40 createdAt, uint40 resolvedAt, uint64 entropySequence, bytes32 entropyCommit, string attackerEmpire, string defenderEmpire))',
  'function resolveBattle(uint256 battleId) external',
  'error NoBase()',
  'error NoEmpire()',
  'error CannotAttackSelf()',
  'error AttackOnCooldown()',
  'error DefendOnCooldown()',
  'error AlreadyInBattle()',
  'error BattleNotFound()',
  'error NotAttacker()',
  'error NotDefender()',
  'error BattleNotPending()',
  'error BattleNotActive()',
  'error AlreadyResolved()',
  'error ChallengeExpiredError()',
  'error InterceptWindowClosed()',
  'error OnlyPythEntropy()',
  'error OnlyOwner()'
]);

const client = createPublicClient({
  chain: somniaTestnet,
  transport: http(),
});

async function main() {
  console.log('--- Fetching Active Battle ---');
  try {
    const battle = await client.readContract({
      address: PVP_ARENA_ADDRESS,
      abi: PVP_ARENA_ABI,
      functionName: 'getActiveBattleForAttacker',
      args: [ATTACKER_ADDRESS],
    });

    console.log('Battle Struct:', JSON.stringify(battle, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value, 2));

    if (battle.id === 0n) {
      console.log('No active battle found for this attacker.');
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = Number(battle.createdAt) + 300;
    console.log(`Current Time (Est): ${now}`);
    console.log(`Battle Expires At: ${expiresAt}`);
    console.log(`Expired? ${now > expiresAt}`);

    console.log('\n--- Simulating resolveBattle ---');
    try {
      await client.simulateContract({
        address: PVP_ARENA_ADDRESS,
        abi: PVP_ARENA_ABI,
        functionName: 'resolveBattle',
        args: [battle.id],
        account: ATTACKER_ADDRESS,
      });
      console.log('Simulation SUCCESSful! (Wait, it should have reverted?)');
    } catch (err) {
      console.log('Simulation REVERTED as expected:');
      console.log(err.message);
      if (err.data) {
        console.log('Revert Data:', err.data);
      }
      // If viem decodes the error, it might be in err.errorName or similar
      if (err.cause) {
        console.log('Cause:', err.cause.message || err.cause);
      }
    }
  } catch (err) {
    console.error('Failed to fetch battle or simulate:', err);
  }
}

main();
