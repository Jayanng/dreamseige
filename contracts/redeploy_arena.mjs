import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';

const somniaTestnet = defineChain({
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://dream-rpc.somnia.network"] },
    public:  { http: ["https://dream-rpc.somnia.network"] },
  },
  testnet: true,
});

const pk = '0x630686ba746fbcb4d99886e39fa576ee3cd87c9df3ac96ff3491732e66bca4f0';
const account = privateKeyToAccount(pk);

const client = createPublicClient({
  chain: somniaTestnet,
  transport: http(),
});

const wallet = createWalletClient({
  account,
  chain: somniaTestnet,
  transport: http(),
});

const BASE_CONTRACT = '0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66';
const LEADERBOARD = '0x95396246b715Ff6a7Db39040E9be43Bdb5701b0b';
const RESOURCE_VAULT = '0xa737c12dc5291cd67715e1cb5e0b04cfeb70ab3d';
const EMPIRE_REGISTRY = '0x1d617cC33411562c0c25Ce35A1B6F08E92d74916';

async function deploy() {
  console.log('--- DEPLOYING NEW PvPArena ---');
  const artifact = JSON.parse(fs.readFileSync('./out/PvPArena.sol/PvPArena.json', 'utf8'));
  const bytecode = artifact.bytecode.object;

  const hash = await wallet.deployContract({
    abi: artifact.abi,
    bytecode,
    args: [],
  });

  console.log('Deployment Hash:', hash);
  const receipt = await client.waitForTransactionReceipt({ hash });
  const newArenaAddress = receipt.contractAddress;
  console.log('New PvPArena Address:', newArenaAddress);

  if (!newArenaAddress) throw new Error('Deployment failed - no address');

  console.log('\n--- REWIRING PvPArena HUBS ---');
  
  const rewires = [
    { name: 'setBaseContract', args: [BASE_CONTRACT] },
    { name: 'setLeaderboard', args: [LEADERBOARD] },
    { name: 'setResourceVault', args: [RESOURCE_VAULT] },
    { name: 'setEmpireRegistry', args: [EMPIRE_REGISTRY] },
  ];

  for (const call of rewires) {
    console.log(`Calling PvPArena.${call.name}(${call.args})...`);
    const tx = await wallet.writeContract({
      address: newArenaAddress,
      abi: artifact.abi,
      functionName: call.name,
      args: call.args,
    });
    await client.waitForTransactionReceipt({ hash: tx });
    console.log(`Success: ${tx}`);
  }

  console.log('\n--- UPDATING ResourceVault ---');
  const VAULT_ABI = [
    { name: 'setPvPArena', type: 'function', inputs: [{ name: '_arena', type: 'address' }] }
  ];
  console.log(`Calling ResourceVault.setPvPArena(${newArenaAddress})...`);
  const vtx = await wallet.writeContract({
    address: RESOURCE_VAULT,
    abi: VAULT_ABI,
    functionName: 'setPvPArena',
    args: [newArenaAddress],
  });
  await client.waitForTransactionReceipt({ hash: vtx });
  console.log(`Success: ${vtx}`);

  console.log('\n--- UPDATING LeaderboardContract ---');
  const LEADERBOARD_ABI = [
    { name: 'setPvPArena', type: 'function', inputs: [{ name: '_arena', type: 'address' }] }
  ];
  console.log(`Calling LeaderboardContract.setPvPArena(${newArenaAddress})...`);
  const ltx = await wallet.writeContract({
    address: LEADERBOARD,
    abi: LEADERBOARD_ABI,
    functionName: 'setPvPArena',
    args: [newArenaAddress],
  });
  await client.waitForTransactionReceipt({ hash: ltx });
  console.log(`Success: ${ltx}`);

  console.log('\n--- ALL Rewires Complete! ---');
  console.log('New PvPArena:', newArenaAddress);
}

deploy().catch(console.error);
