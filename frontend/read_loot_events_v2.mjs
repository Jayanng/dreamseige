import { createPublicClient, http, parseAbiItem } from "viem";

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

const RESOURCE_VAULT = "0xa737c12dc5291cd67715e1cb5e0b04cfeb70ab3d";

const LOOT_TRANSFERRED = parseAbiItem(
  "event LootTransferred(address indexed attacker, address indexed defender, uint64 creditsLooted, uint64 biomassLooted, uint64 mineraLooted, uint256 battleId)"
);

async function main() {
  const latestBlock = await client.getBlockNumber();
  const fromBlock   = latestBlock - 1000n;

  console.log(`\n🔍 Searching blocks ${fromBlock} → ${latestBlock}`);
  console.log(`📍 ResourceVault: ${RESOURCE_VAULT}\n`);

  const logs = await client.getLogs({
    address:   RESOURCE_VAULT,
    event:     LOOT_TRANSFERRED,
    fromBlock,
    toBlock:   latestBlock,
  });

  if (logs.length === 0) {
    console.log("No events found");
    return;
  }

  console.log(`✅ Found ${logs.length} event(s):\n`);
  logs.forEach((log, i) => {
    const { attacker, defender, creditsLooted, biomassLooted, mineraLooted, battleId } = log.args;
    console.log(`[Event ${i + 1}]`);
    console.log(`TxHash:         ${log.transactionHash}`);
    console.log(`Block:          ${log.blockNumber}`);
    console.log(`Attacker:       ${attacker}`);
    console.log(`Defender:       ${defender}`);
    console.log(`Credits Looted: ${creditsLooted}`);
    console.log(`Biomass Looted: ${biomassLooted}`);
    console.log(`Minera Looted:  ${mineraLooted}`);
    console.log(`Battle ID:      ${battleId}`);
    console.log("-".repeat(40));
  });
}

main().catch(console.error);
