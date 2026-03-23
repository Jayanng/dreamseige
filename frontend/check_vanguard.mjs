import { createPublicClient, http } from 'viem';

// Setup Viem client pointing to Somnia Testnet
const transport = http('https://dream-rpc.somnia.network');

const publicClient = createPublicClient({
  transport,
});

const RESOURCE_VAULT_ADDRESS = "0xa737c12dc5291cd67715e1cb5e0b04cfeb70ab3d";

// Simplified ABI to read the 'vaults' mapping
const ABI = [
  {
    "type": "function",
    "name": "vaults",
    "inputs": [{ "name": "owner", "type": "address" }],
    "outputs": [
      { "name": "gold", "type": "uint256" },
      { "name": "wood", "type": "uint256" },
      { "name": "stone", "type": "uint256" },
      { "name": "vanguard", "type": "uint256" }, // uint64 returned as BigInt (uint256 equivalent in viem decoding shape here)
      { "name": "lastCollectTime", "type": "uint256" }
    ],
    "stateMutability": "view"
  }
];

async function checkWallet(walletAddress, name) {
  try {
    const data = await publicClient.readContract({
      address: RESOURCE_VAULT_ADDRESS,
      abi: ABI,
      functionName: 'vaults',
      args: [walletAddress]
    });
    
    console.log(`--- ${name} (${walletAddress}) ---`);
    console.log(`Credits (Gold): ${data[0]}`);
    console.log(`Biomass (Wood): ${data[1]}`);
    console.log(`Minera (Stone): ${data[2]}`);
    console.log(`Vanguard:       ${data[3]}`);
    console.log('');
  } catch (err) {
    console.error(`Error reading data for ${name} (${walletAddress}):`, err.message);
  }
}

async function main() {
  console.log("Querying Vanguard balances from ResourceVault...");
  console.log("");
  await checkWallet("0x71708D8171F0Af75b0184861906B3678f7337E50", "Wallet 1");
  await checkWallet("0xF9F2393673c1B4c16Eb53ca7e37A5CAf653Bb13e", "Wallet 2");
}

main().catch(console.error);
