const { keccak256, toHex, encodeErrorResult } = require('viem');

const errors = [
    "NoBase()",
    "NoEmpire()",
    "CannotAttackSelf()",
    "AttackOnCooldown()",
    "DefendOnCooldown()",
    "AlreadyInBattle()",
    "BattleNotFound()",
    "NotAttacker()",
    "NotDefender()",
    "BattleNotPending()",
    "BattleNotActive()",
    "AlreadyResolved()",
    "ChallengeExpiredError()",
    "InterceptWindowClosed()",
    "OnlyPythEntropy()",
    "OnlyOwner()"
];

console.log("Selector | Error");
console.log("---------|------");
errors.forEach(e => {
    const selector = keccak256(Buffer.from(e)).slice(0, 10);
    console.log(`${selector} | ${e}`);
});
