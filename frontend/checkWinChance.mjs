import { createPublicClient, http, parseAbi } from "viem";

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

const PVP_ARENA = "0xc16548ee3533c0653e6fb256db8ef61278816bed";
const BASE_CONTRACT = "0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66";

const WALLET1 = "0x71708D8171F0Af75b0184861906B3678f7337E50";
const WALLET2 = "0xF9F2393673c1B4c16Eb53ca7e37A5CAf653Bb13e";

const ARENA_ABI = parseAbi([
  "function getWinChance(address attacker, address defender) view returns (uint256)"
]);

const BASE_ABI = parseAbi([
  "function getBase(address player) view returns ((address owner, bool initialized, uint64 gold, uint64 wood, uint64 stone, uint32 attackPower, uint32 defensePower, uint40 lastTickAt, uint32 totalWins, uint32 totalLosses, uint64 goldRate, uint64 woodRate, uint64 stoneRate, uint8 buildingCount))"
]);

async function main() {
  console.log("\n--- PvP Analysis ---");
  
  // 1. Get Win Chances
  const winChance1 = await client.readContract({
    address: PVP_ARENA,
    abi: ARENA_ABI,
    functionName: "getWinChance",
    args: [WALLET1, WALLET2],
  });

  const winChance2 = await client.readContract({
    address: PVP_ARENA,
    abi: ARENA_ABI,
    functionName: "getWinChance",
    args: [WALLET2, WALLET1],
  });

  console.log(`\nWallet 1: ${WALLET1}`);
  console.log(`Wallet 2: ${WALLET2}`);
  
  console.log(`\nWallet1 attacking Wallet2 win chance: ${winChance1}%`);
  console.log(`Wallet2 attacking Wallet1 win chance: ${winChance2}%`);

  // 2. Get Power Levels
  const base1 = await client.readContract({
    address: BASE_CONTRACT,
    abi: BASE_ABI,
    functionName: "getBase",
    args: [WALLET1],
  });

  const base2 = await client.readContract({
    address: BASE_CONTRACT,
    abi: BASE_ABI,
    functionName: "getBase",
    args: [WALLET2],
  });

  console.log("\n--- Power Levels ---");
  console.log(`Wallet 1: ATK ${base1.attackPower}, DEF ${base1.defensePower}`);
  console.log(`Wallet 2: ATK ${base2.attackPower}, DEF ${base2.defensePower}\n`);
}

main().catch(console.error);
