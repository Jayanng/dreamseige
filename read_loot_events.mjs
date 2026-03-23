import { createPublicClient, http, parseAbiItem } from "viem";

// ── Chain config ──────────────────────────────────────────────────────────────
const somniaTestnet = {
  id: 50312,
  name: "Somnia Testnet",
  network: "somnia-testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://dream-rpc.somnia.network"] },
    public:  { http: ["https://dream-rpc.somnia.network"] },
  },
};

const client = createPublicClient({
  chain: somniaTestnet,
  transport: http(),
});

// ── Addresses ─────────────────────────────────────────────────────────────────
const RESOURCE_VAULT = "0x69720c73a855996a32ed590e64536c77095d2f77";

// ── Event ABI ─────────────────────────────────────────────────────────────────
const LOOT_TRANSFERRED = parseAbiItem(
  "event LootTransferred(address indexed attacker, address indexed defender, uint64 creditsLooted, uint64 biomassLooted, uint64 mineraLooted, uint256 indexed battleId)"
);

async function main() {
  // Get current block
  const latestBlock = await client.getBlockNumber();
  const fromBlock   = latestBlock - 100n; // search last 100 blocks to be safe

  console.log(`\n🔍 Scanning blocks ${fromBlock} → ${latestBlock} on ResourceVault ${RESOURCE_VAULT}\n`);

  const logs = await client.getLogs({
    address:   RESOURCE_VAULT,
    event:     LOOT_TRANSFERRED,
    fromBlock,
    toBlock:   latestBlock,
  });

  if (logs.length === 0) {
    console.log("⚠️  No LootTransferred events found in the last 100 blocks.");
    console.log("    Extending search to last 1000 blocks...\n");
 
    const extendedFrom = latestBlock - 1000n;
    const extLogs = await client.getLogs({
      address:   RESOURCE_VAULT,
      event:     LOOT_TRANSFERRED,
      fromBlock: extendedFrom,
      toBlock:   latestBlock,
    });

    if (extLogs.length === 0) {
      console.log("❌ No LootTransferred events found in the last 1000 blocks.");
      return;
    }

    printLogs(extLogs);
    return;
  }

  printLogs(logs);
}

function printLogs(logs) {
  console.log(`✅ Found ${logs.length} LootTransferred event(s):\n`);
  console.log("═".repeat(70));

  for (const log of logs) {
    const { attacker, defender, creditsLooted, biomassLooted, mineraLooted, battleId } = log.args;
    console.log(`Block:          ${log.blockNumber}`);
    console.log(`TxHash:         ${log.transactionHash}`);
    console.log(`─`.repeat(70));
    console.log(`Attacker:       ${attacker}`);
    console.log(`Defender:       ${defender}`);
    console.log(`Credits Looted: ${creditsLooted}`);
    console.log(`Biomass Looted: ${biomassLooted}`);
    console.log(`Minera Looted:  ${mineraLooted}`);
    console.log(`Battle ID:      ${battleId}`);
    console.log("═".repeat(70));
    console.log();
  }
}

main().catch(console.error);
