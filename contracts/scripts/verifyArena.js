const path = require('path');
const { createPublicClient, http } = require('C:\\Users\\dell\\Documents\\VS_code\\dreamsiege\\frontend\\node_modules\\viem\\_cjs\\index.js');

const client = createPublicClient({
  transport: http('https://dream-rpc.somnia.network')
});

const arenaAddress = '0x6bf38e8a094aa64855bc9b94756079f17b7220f1';

const abi = [
  { name: 'baseContract', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'leaderboard', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'resourceVault', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'empireRegistry', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] }
];

async function main() {
  console.log(`Checking PvPArena at ${arenaAddress}...`);
  const baseContract = await client.readContract({ address: arenaAddress, abi, functionName: 'baseContract' });
  const leaderboard = await client.readContract({ address: arenaAddress, abi, functionName: 'leaderboard' });
  const resourceVault = await client.readContract({ address: arenaAddress, abi, functionName: 'resourceVault' });
  const empireRegistry = await client.readContract({ address: arenaAddress, abi, functionName: 'empireRegistry' });

  console.log(`\n--- PvPArena State ---`);
  console.log(`baseContract:   ${baseContract}`);
  console.log(`leaderboard:    ${leaderboard}`);
  console.log(`resourceVault:  ${resourceVault}`);
  console.log(`empireRegistry: ${empireRegistry}`);
}

main().catch(console.error);
