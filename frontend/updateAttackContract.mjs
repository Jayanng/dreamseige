import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

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

const BASE_CONTRACT_ADDRESS = '0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66';
const NEW_PVP_ARENA_ADDRESS = '0xc16548ee3533c0653e6fb256db8ef61278816bed';

const client = createPublicClient({
  chain: somniaTestnet,
  transport: http(),
});

const wallet = createWalletClient({
  account,
  chain: somniaTestnet,
  transport: http(),
});

const BASE_ABI = [
  {
    name: 'attackContract',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    name: 'setAttackContract',
    type: 'function',
    inputs: [{ name: '_attackContract', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
];

async function main() {
  console.log('--- BaseContract: Update attackContract ---');
  
  // 1. Read current attackContract
  console.log(`Reading attackContract from ${BASE_CONTRACT_ADDRESS}...`);
  const currentAttackContract = await client.readContract({
    address: BASE_CONTRACT_ADDRESS,
    abi: BASE_ABI,
    functionName: 'attackContract',
  });
  console.log(`Current attackContract: ${currentAttackContract}`);

  if (currentAttackContract.toLowerCase() === NEW_PVP_ARENA_ADDRESS.toLowerCase()) {
    console.log('attackContract is already set to the target address. No update needed.');
    return;
  }

  // 2. Call setAttackContract
  console.log(`Updating attackContract to ${NEW_PVP_ARENA_ADDRESS}...`);
  const hash = await wallet.writeContract({
    address: BASE_CONTRACT_ADDRESS,
    abi: BASE_ABI,
    functionName: 'setAttackContract',
    args: [NEW_PVP_ARENA_ADDRESS],
  });
  
  console.log(`Transaction Hash: ${hash}`);
  
  console.log('Waiting for confirmation...');
  const receipt = await client.waitForTransactionReceipt({ hash });
  
  if (receipt.status === 'success') {
    console.log('Transaction Successful!');
    
    // Verify update
    const updatedAttackContract = await client.readContract({
      address: BASE_CONTRACT_ADDRESS,
      abi: BASE_ABI,
      functionName: 'attackContract',
    });
    console.log(`Verified new attackContract: ${updatedAttackContract}`);
  } else {
    console.error('Transaction Failed.');
    console.error(receipt);
  }
}

main().catch(console.error);
