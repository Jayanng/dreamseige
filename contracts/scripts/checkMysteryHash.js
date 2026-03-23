const { keccak256, stringToBytes, toHex } = require('C:\\Users\\dell\\Documents\\VS_code\\dreamsiege\\frontend\\node_modules\\viem\\_cjs\\index.js');

const signatures = [
  "BattleResolved(uint256,address,address,bool,uint64,uint64,uint64,string,string)",
  "ChallengeIssued(uint256,address,address,string,string,uint32,uint32,uint40)",
  "RaidIntercepted(uint256,address,address,string,uint40)",
  "ChallengeExpired(uint256,address,address)",
  "GlobalBattleEvent(uint256,string,string,bool,uint64,uint40)",
  "OwnershipTransferred(address,address)", // Standard OZ
  "Transfer(address,address,uint256)",      // Standard ERC20/721
  "Approval(address,address,uint256)"
];

const checkHash = "0xdcd917af8a513c66d89a6392cfdc45861ca0184fb4201860106ba5055ffabd1e";
console.log(`Checking against: ${checkHash}\n`);

let found = false;
for (const sig of signatures) {
  const hash = keccak256(toHex(stringToBytes(sig)));
  const match = hash.toLowerCase() === checkHash.toLowerCase();
  console.log(`${match ? '[MATCH] ' : '        '}${sig} -> ${hash}`);
  if (match) {
    found = true;
    console.log(`\n✅ FOUND MATCH: The mystery hash is ${sig}`);
  }
}

if (!found) {
  console.log("\n❌ NO MATCH FOUND in PvPArena primary events.");
}
