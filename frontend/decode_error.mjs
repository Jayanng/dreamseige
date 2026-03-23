import { keccak256, toBytes } from 'viem';

const errors = [
  // PvPArena.sol
  'NoBase',
  'NoEmpire',
  'CannotAttackSelf',
  'AttackOnCooldown',
  'DefendOnCooldown',
  'AlreadyInBattle',
  'BattleNotFound',
  'NotAttacker',
  'NotDefender',
  'BattleNotPending',
  'BattleNotActive',
  'AlreadyResolved',
  'ChallengeExpiredError',
  'InterceptWindowClosed',
  'OnlyPythEntropy',
  'OnlyOwner',
  // ResourceVault.sol
  'NotInitialized',
  'OnlyArena',
  'OnlyBaseContract',
  'InsufficientResources',
  'CooldownActive',
  // RewardsDistributor.sol
  'NoPendingRewards',
  'CycleNotEnded',
  'CycleAlreadyDistributed',
  'InsufficientBalance',
  'AlreadyClaimedToday',
  // LeaderboardContract.sol
  'NotRegistered',
  // EmpireRegistry.sol
  'NameTooShort',
  'NameTooLong',
  'NameTaken',
  'NameInvalid',
  'EmpireNotFound',
  'AlreadyRegistered',
  'NotEmpireOwner',
  'TierNotReached',
  // BaseContract.sol
  'AlreadyInitialized',
  'NotBaseOwner',
  'InvalidSlot',
  'SlotOccupied',
  'SlotEmpty',
  'UpgradeAlreadyInProgress',
  'UpgradeNotComplete',
  'InsufficientBalance',
  'NoPendingRewards',
  'CycleNotEnded',
  'CycleAlreadyDistributed',
  'AlreadyClaimedToday',
];

const target = '0x64a0b591';

console.log('\nDecoding selector:', target);
console.log('─'.repeat(50));

for (const e of [...new Set(errors)]) {
  const sig = `${e}()`;
  const hash = keccak256(toBytes(sig));
  const selector = hash.slice(0, 10);
  const match = selector === target;
  if (match) {
    console.log(`${selector}  ${sig}  <=== MATCH ✅`);
  } else {
    // console.log(`${selector}  ${sig}`);
  }
}
