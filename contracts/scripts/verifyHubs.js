const path = require('path');
const { createPublicClient, http } = require('C:\\Users\\dell\\Documents\\VS_code\\dreamsiege\\frontend\\node_modules\\viem\\_cjs\\index.js');

const client = createPublicClient({
  transport: http('https://dream-rpc.somnia.network')
});

const VAULT = '0x714256500e5b48836b823DF82c5F4CC2A8E88B55';
const LEADERBOARD = '0x95396246b715Ff6a7Db39040E9be43Bdb5701b0b';

const abi = [
  { name: 'pvpArena', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
];

async function main() {
  console.log(`Checking Hub Architecture...`);
  
  try {
    const vaultArena = await client.readContract({ address: VAULT, abi, functionName: 'pvpArena' });
    const leaderboardArena = await client.readContract({ address: LEADERBOARD, abi, functionName: 'pvpArena' });

    console.log(`\n--- Hub Status ---`);
    console.log(`Resource Vault PvP Arena:  ${vaultArena}`);
    console.log(`Leaderboard PvP Arena:     ${leaderboardArena}`);
  } catch (e) {
    console.error('Error reading contracts:', e.shortMessage || e.message);
  }
}

main().catch(console.error);
