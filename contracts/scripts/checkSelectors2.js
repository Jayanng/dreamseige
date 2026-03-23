const crypto = require('crypto');

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
    "OnlyOwner()",
    "EmpireNotFound()",
    "NotInitialized()",
    "InsufficientResources()",
    "Unauthorized()"
];

function keccak256(str) {
    return "0x" + crypto.createHash('sha3-256').update(str).digest('hex');
}

// NOTE: Sha3-256 is NOT Keccak-256. Node's crypto doesn't have Keccak natively.
// I'll use a trick or just wait for cast.
// Actually, I'll use `cast` one-by-one in a loop via terminal.

console.log("Use cast for each error.");
