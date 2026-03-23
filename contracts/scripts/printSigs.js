const crypto = require('crypto');

// SHA3 is not Keccak, but there are libs or we can use cast.
// I'll use cast sig one by one to avoid issues.

const list = [
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
    "OnlyOwner()",
    "OnlyArena()",
    "OnlyBaseContract()",
    "NotInitialized()",
    "InsufficientResources()",
    "CooldownActive()",
    "NotEmpireOwner()",
    "EmpireNotFound()",
    "NameTaken()",
    "InsufficientVanguard()",
    "TargetNotInitialized()"
];

console.log("Run this:");
list.forEach(e => {
    console.log(`cast sig "${e}"`);
});
