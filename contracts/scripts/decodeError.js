const { keccak256, toHex, stringToBytes, encodePacked } = require('C:\\Users\\dell\\Documents\\VS_code\\dreamsiege\\frontend\\node_modules\\viem\\_cjs\\index.js');

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

const targetSelector = "0xf2592cf2";

console.log(`Target Selector: ${targetSelector}\n`);

let found = false;
for (const error of errors) {
  const hash = keccak256(toHex(stringToBytes(error)));
  const selector = hash.slice(0, 10); // 0x + 8 chars
  
  const match = selector.toLowerCase() === targetSelector.toLowerCase();
  console.log(`${match ? '[MATCH] ' : '        '}${error} -> ${selector}`);
  
  if (match) {
    console.log(`\n✅ FOUND MATCH: The error is ${error}`);
    found = true;
  }
}

if (!found) {
  console.log("\n❌ No match found in the provided list.");
}
