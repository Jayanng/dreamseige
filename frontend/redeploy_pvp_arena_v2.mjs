import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";

// Manually parse ../contracts/.env
let DEPLOYER_PK;
let RPC_URL;
try {
  const envStr = readFileSync("../contracts/.env", "utf8");
  const lines = envStr.split("\n");
  for (const line of lines) {
    const [key, val] = line.split("=");
    if (key && val) {
      if (key.trim() === "DEPLOYER_PRIVATE_KEY") DEPLOYER_PK = val.trim().replace(/^"|"$/g, '');
      if (key.trim() === "SOMNIA_RPC_URL") RPC_URL = val.trim().replace(/^"|"$/g, '');
    }
  }
} catch (e) {
  console.error("Failed to read ../contracts/.env", e);
  process.exit(1);
}

if (!DEPLOYER_PK || !RPC_URL) {
  console.error("Missing DEPLOYER_PRIVATE_KEY or SOMNIA_RPC_URL in .env");
  process.exit(1);
}

const account = privateKeyToAccount(DEPLOYER_PK);

const somniaTestnet = {
  id: 50312,
  name: "Somnia Testnet",
  rpcUrls: {
    default: { http: [RPC_URL] },
    public:  { http: [RPC_URL] },
  },
};

const client = createPublicClient({ chain: somniaTestnet, transport: http() });
const wallet = createWalletClient({ chain: somniaTestnet, transport: http(), account });

// Addresses from request
const BASE_CONTRACT_ADDR  = "0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66";
const LEADERBOARD_ADDR    = "0x95396246b715Ff6a7Db39040E9be43Bdb5701b0b";
const RESOURCE_VAULT_ADDR = "0xa737c12dc5291cd67715e1cb5e0b04cfeb70ab3d";
const EMPIRE_REGISTRY_ADDR = "0x1d617cC33411562c0c25Ce35A1B6F08E92d74916";

// Path to artifact
const ARTIFACT_PATH = "../contracts/out/PvPArena.sol/PvPArena.json";

// ABIs
const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));
const VAULT_ABI = [
  { "type": "function", "name": "setPvPArena", "inputs": [{ "name": "_arena", "type": "address" }], "outputs": [], "stateMutability": "nonpayable" }
];
const LEADERBOARD_ABI = [
  { "type": "function", "name": "setPvPArena", "inputs": [{ "name": "_arena", "type": "address" }], "outputs": [], "stateMutability": "nonpayable" }
];
const BASE_ABI = [
  { "type": "function", "name": "setAttackContract", "inputs": [{ "name": "_attack", "type": "address" }], "outputs": [], "stateMutability": "nonpayable" }
];

async function main() {
  console.log("\n🚀 Deploying new PvPArena...");
  
  const hash = await wallet.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode.object,
  });
  
  console.log(`⏳ Deployment Tx Hash: ${hash}`);
  const receipt = await client.waitForTransactionReceipt({ hash });
  const newArenaAddr = receipt.contractAddress;
  console.log(`✅ PvPArena deployed at: ${newArenaAddr}`);

  const arenaAbiParsed = parseAbi([
    "function setBaseContract(address)",
    "function setLeaderboard(address)",
    "function setResourceVault(address)",
    "function setEmpireRegistry(address)"
  ]);

  console.log("\n🔗 Rewiring PvPArena hubs...");
  
  const rewireCalls = [
    { name: "setBaseContract", args: [BASE_CONTRACT_ADDR] },
    { name: "setLeaderboard", args: [LEADERBOARD_ADDR] },
    { name: "setResourceVault", args: [RESOURCE_VAULT_ADDR] },
    { name: "setEmpireRegistry", args: [EMPIRE_REGISTRY_ADDR] },
  ];

  for (const call of rewireCalls) {
    const h = await wallet.writeContract({
      address: newArenaAddr,
      abi: arenaAbiParsed,
      functionName: call.name,
      args: call.args,
    });
    console.log(` - ${call.name} in progress: ${h}`);
    await client.waitForTransactionReceipt({ hash: h });
  }

  console.log("\n🔗 Updating other contracts to point to new Arena...");

  // ResourceVault.setPvPArena
  const h1 = await wallet.writeContract({
    address: RESOURCE_VAULT_ADDR,
    abi: VAULT_ABI,
    functionName: "setPvPArena",
    args: [newArenaAddr],
  });
  console.log(` - ResourceVault.setPvPArena in progress: ${h1}`);
  await client.waitForTransactionReceipt({ hash: h1 });

  // Leaderboard.setPvPArena
  const h2 = await wallet.writeContract({
    address: LEADERBOARD_ADDR,
    abi: LEADERBOARD_ABI,
    functionName: "setPvPArena",
    args: [newArenaAddr],
  });
  console.log(` - Leaderboard.setPvPArena in progress: ${h2}`);
  await client.waitForTransactionReceipt({ hash: h2 });

  // BaseContract.setAttackContract
  const h3 = await wallet.writeContract({
    address: BASE_CONTRACT_ADDR,
    abi: BASE_ABI,
    functionName: "setAttackContract",
    args: [newArenaAddr],
  });
  console.log(` - BaseContract.setAttackContract in progress: ${h3}`);
  await client.waitForTransactionReceipt({ hash: h3 });

  console.log("\n🎉 All contracts rewired successfully!");
  console.log(`New Arena Address: ${newArenaAddr}\n`);
}

main().catch(console.error);
