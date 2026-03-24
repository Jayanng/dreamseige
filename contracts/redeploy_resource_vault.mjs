import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

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

const pk = process.env.DEPLOYER_PRIVATE_KEY;
if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not found in .env');
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
const PVP_ARENA = '0xd8665b7f204b073843334d9747317829e5a83945';

async function deploy() {
  console.log('--- DEPLOYING NEW ResourceVault ---');
  const artifact = JSON.parse(fs.readFileSync('./out/ResourceVault.sol/ResourceVault.json', 'utf8'));
  const bytecode = artifact.bytecode.object;

  const hash = await wallet.deployContract({
    abi: artifact.abi,
    bytecode,
    args: [],
  });

  console.log('Deployment Hash:', hash);
  const receipt = await client.waitForTransactionReceipt({ hash });
  const newVaultAddress = receipt.contractAddress;
  console.log('New ResourceVault Address:', newVaultAddress);

  if (!newVaultAddress) throw new Error('Deployment failed - no address');

  console.log('\n--- REWIRING ResourceVault ---');
  
  const rewires = [
    { name: 'setBaseContract', args: [BASE_CONTRACT] },
    { name: 'setPvPArena', args: [PVP_ARENA] },
  ];

  for (const call of rewires) {
    console.log(`Calling ResourceVault.${call.name}(${call.args})...`);
    const tx = await wallet.writeContract({
      address: newVaultAddress,
      abi: artifact.abi,
      functionName: call.name,
      args: call.args,
    });
    await client.waitForTransactionReceipt({ hash: tx });
    console.log(`Success: ${tx}`);
  }

  console.log('\n--- UPDATING BaseContract ---');
  const BASE_ABI = [
    { name: 'setResourceVault', type: 'function', inputs: [{ name: '_resourceVault', type: 'address' }] }
  ];
  console.log(`Calling BaseContract.setResourceVault(${newVaultAddress})...`);
  const btx = await wallet.writeContract({
    address: BASE_CONTRACT,
    abi: BASE_ABI,
    functionName: 'setResourceVault',
    args: [newVaultAddress],
  });
  await client.waitForTransactionReceipt({ hash: btx });
  console.log(`Success: ${btx}`);

  console.log('\n--- UPDATING PvPArena ---');
  const ARENA_ABI = [
    { name: 'setResourceVault', type: 'function', inputs: [{ name: '_vault', type: 'address' }] }
  ];
  console.log(`Calling PvPArena.setResourceVault(${newVaultAddress})...`);
  const atx = await wallet.writeContract({
    address: PVP_ARENA,
    abi: ARENA_ABI,
    functionName: 'setResourceVault',
    args: [newVaultAddress],
  });
  await client.waitForTransactionReceipt({ hash: atx });
  console.log(`Success: ${atx}`);

  console.log('\n--- ALL Rewires Complete! ---');
  console.log('New ResourceVault:', newVaultAddress);
}

deploy().catch(console.error);
