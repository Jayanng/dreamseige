const { keccak256, stringToBytes, toHex } = require('C:\\Users\\dell\\Documents\\VS_code\\dreamsiege\\frontend\\node_modules\\viem\\_cjs\\index.js');

const battleResolvedSign = "BattleResolved(uint256,address,address,bool,uint64,uint64,uint64,string,string)";
const challengeIssuedSign = "ChallengeIssued(uint256,address,address,string,string,uint32,uint32,uint40)";

const battleResolvedHash = keccak256(toHex(stringToBytes(battleResolvedSign)));
const challengeIssuedHash = keccak256(toHex(stringToBytes(challengeIssuedSign)));

console.log(`BattleResolved Signature: ${battleResolvedSign}`);
console.log(`BattleResolved Topic0:    ${battleResolvedHash}\n`);

console.log(`ChallengeIssued Signature: ${challengeIssuedSign}`);
console.log(`ChallengeIssued Topic0:     ${challengeIssuedHash}\n`);

const checkHash = "0xdcd917af8a513c66d89a6392cfdc45861ca0184fb4201860106ba5055ffabd1e";
console.log(`Checking against: ${checkHash}`);

const match = checkHash.toLowerCase() === battleResolvedHash.toLowerCase();
console.log(`\nRESULT: ${match ? 'MATCH ✅' : 'NO MATCH ❌'}`);
