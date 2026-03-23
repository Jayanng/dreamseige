import { createPublicClient, http, parseAbi } from "viem";
import { readFileSync } from "fs";

const somniaTestnet = {
  id: 50312,
  name: "Somnia Testnet",
  rpcUrls: {
    default: { http: ["https://dream-rpc.somnia.network"] },
    public:  { http: ["https://dream-rpc.somnia.network"] },
  },
};

const client = createPublicClient({
  chain: somniaTestnet,
  transport: http(),
});

const PVP_ARENA_ADDR = "0xd8665b7f204b073843334d9747317829e5a83945";
const BASE_CONTRACT_ADDR = "0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66";
const LEADERBOARD_ADDR = "0x95396246b715Ff6a7Db39040E9be43Bdb5701b0b";
const RESOURCE_VAULT_ADDR = "0xa737c12dc5291cd67715e1cb5e0b04cfeb70ab3d";
const EMPIRE_REGISTRY_ADDR = "0x1d617cC33411562c0c25Ce35A1B6F08E92d74916";

const ABIS = {
  PVP_ARENA: parseAbi([
    "function baseContract() view returns (address)",
    "function leaderboard() view returns (address)",
    "function resourceVault() view returns (address)",
    "function empireRegistry() view returns (address)",
    "function challengeExpiry() view returns (uint40)"
  ]),
  RESOURCE_VAULT: parseAbi([
    "function pvpArena() view returns (address)"
  ]),
  LEADERBOARD: parseAbi([
    "function pvpArena() view returns (address)"
  ]),
  BASE_CONTRACT: parseAbi([
    "function attackContract() view returns (address)"
  ]),
};

async function main() {
  console.log("\n--- Final Architecture Check ---");

  const results = [];

  // 1. PvPArena Checks
  try {
    const base = await client.readContract({ address: PVP_ARENA_ADDR, abi: ABIS.PVP_ARENA, functionName: "baseContract" });
    const lead = await client.readContract({ address: PVP_ARENA_ADDR, abi: ABIS.PVP_ARENA, functionName: "leaderboard" });
    const vault = await client.readContract({ address: PVP_ARENA_ADDR, abi: ABIS.PVP_ARENA, functionName: "resourceVault" });
    const registry = await client.readContract({ address: PVP_ARENA_ADDR, abi: ABIS.PVP_ARENA, functionName: "empireRegistry" });
    const expiry = await client.readContract({ address: PVP_ARENA_ADDR, abi: ABIS.PVP_ARENA, functionName: "challengeExpiry" });

    results.push({ name: "PvPArena.baseContract", expected: BASE_CONTRACT_ADDR, actual: base });
    results.push({ name: "PvPArena.leaderboard", expected: LEADERBOARD_ADDR, actual: lead });
    results.push({ name: "PvPArena.resourceVault", expected: RESOURCE_VAULT_ADDR, actual: vault });
    results.push({ name: "PvPArena.empireRegistry", expected: EMPIRE_REGISTRY_ADDR, actual: registry });
    results.push({ name: "PvPArena.challengeExpiry", expected: 180, actual: Number(expiry) });
  } catch (e) {
    console.error("Error checking PvPArena:", e.shortMessage || e.message);
  }

  // 2. ResourceVault Check
  try {
    const arenaVal = await client.readContract({ address: RESOURCE_VAULT_ADDR, abi: ABIS.RESOURCE_VAULT, functionName: "pvpArena" });
    results.push({ name: "ResourceVault.pvpArena", expected: PVP_ARENA_ADDR, actual: arenaVal });
  } catch (e) {
    console.error("Error checking ResourceVault:", e.shortMessage || e.message);
  }

  // 3. Leaderboard Check
  try {
    const arenaVal = await client.readContract({ address: LEADERBOARD_ADDR, abi: ABIS.LEADERBOARD, functionName: "pvpArena" });
    results.push({ name: "Leaderboard.pvpArena", expected: PVP_ARENA_ADDR, actual: arenaVal });
  } catch (e) {
    console.error("Error checking Leaderboard:", e.shortMessage || e.message);
  }

  // 4. BaseContract Check
  try {
    const arenaVal = await client.readContract({ address: BASE_CONTRACT_ADDR, abi: ABIS.BASE_CONTRACT, functionName: "attackContract" });
    results.push({ name: "BaseContract.attackContract", expected: PVP_ARENA_ADDR, actual: arenaVal });
  } catch (e) {
    console.error("Error checking BaseContract:", e.shortMessage || e.message);
  }

  // 5. contracts.ts Check
  try {
    const contractsTs = readFileSync("./src/constants/contracts.ts", "utf8");
    const match = contractsTs.match(/PVP_ARENA:\s*'(0x[a-fA-F0-9]+)'/);
    const arenaInTs = match ? match[1] : "NOT_FOUND";
    results.push({ name: "contracts.ts PVP_ARENA", expected: PVP_ARENA_ADDR, actual: arenaInTs });
  } catch (e) {
    console.error("Error checking contracts.ts:", e.message);
  }

  // Print results
  for (const r of results) {
    const status = String(r.expected).toLowerCase() === String(r.actual).toLowerCase() ? "PASS" : "FAIL";
    console.log(`${r.name.padEnd(30)}: [${status}]  (Expected: ${r.expected}, Actual: ${r.actual})`);
  }
}

main().catch(console.error);
