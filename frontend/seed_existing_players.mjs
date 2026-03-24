import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

// Configure Somnia Shannon Testnet
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

// Load environment variables from contracts/.env
dotenv.config({ path: '../contracts/.env' });

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

const RESOURCE_VAULT_ADDRESS = '0x15c18a11ca29e56a068fb21f4662129dbdbe20ba';
const VAULT_ABI = [
  { 
    name: 'initializeVault', 
    type: 'function', 
    stateMutability: 'nonpayable',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [] 
  }
];

const PLAYERS = [
  "0x25df058a6bf583542e69db26ca0646c7f30b1567",
  "0x3034f27ce59a29e65b79379f11e5a4afa48b549b",
  "0x71708d8171f0af75b0184861906b3678f7337e50",
  "0x7b5ec597913e1cf711051362130e9c59f47606cb",
  "0xafc87c302e0aef2f60f816eb4b398198bf839f4f",
  "0xce21d31b10614570710bcfd04686395d3f8407b6",
  "0xe6883caea9fb52feba55d0378cb6edb979c9c0aa",
  "0xf4904da804e69ca463da637397abe10b7b0163ce",
  "0xf5807b40adb33c2928e6d1b350918990bdd2a11f",
  "0xf9f2393673c1b4c16eb53ca7e37a5caf653bb13e"
];

async function seedPlayers() {
  console.log(`--- SEEDING ${PLAYERS.length} PLAYERS ---`);
  console.log(`Vault: ${RESOURCE_VAULT_ADDRESS}\n`);

  for (const player of PLAYERS) {
    try {
      console.log(`Seeding ${player}...`);
      const hash = await wallet.writeContract({
        address: RESOURCE_VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'initializeVault',
        args: [player],
      });

      console.log(`  Transaction: ${hash}`);
      const receipt = await client.waitForTransactionReceipt({ hash });
      console.log(`  ✅ Success: Block ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`  ❌ Failed for ${player}:`, error.shortMessage || error.message);
    }
    console.log('-----------------------------------');
  }

  console.log('\n--- Seeding Process Complete ---');
}

seedPlayers().catch(console.error);
