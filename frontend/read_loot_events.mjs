import { createPublicClient, http, parseAbiItem } from "viem";

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

const RESOURCE_VAULT = "0xa737c12dc5291cd67715e1cb5e0b04cfeb70ab3d";
const PVP_ARENA     = "0x67097c8e6be1f1bd8b8094353ac4e7b8cd137b01";
const CHUNK         = 1000n; // RPC max

const LOOT_TRANSFERRED_ABI = parseAbiItem(
  "event LootTransferred(address indexed attacker, address indexed defender, uint64 creditsLooted, uint64 biomassLooted, uint64 mineraLooted, uint256 indexed battleId)"
);

// We'll parse this manually from receipts since we don't know the exact RaidResolved sig
// interceptRaid(address defender, uint256 battleId) selector → look at method ID
const INTERCEPT_RAID_SELECTOR = "0x" + Buffer.from(
  new Uint8Array([0x12, 0x34, 0x56, 0x78]) // placeholder – we scan receipts instead
).toString("hex").slice(0, 8);

async function getLogs1000(address, event, fromBlock, toBlock) {
  const chunks = [];
  let current = fromBlock;
  while (current <= toBlock) {
    const end = current + CHUNK - 1n > toBlock ? toBlock : current + CHUNK - 1n;
    const logs = await client.getLogs({ address, event, fromBlock: current, toBlock: end });
    chunks.push(...logs);
    current = end + 1n;
  }
  return chunks;
}

async function main() {
  const latestBlock = await client.getBlockNumber();
  const searchFrom  = latestBlock - 5000n; // 5000 blocks ~ ~1.5 hours at 1 block/sec

  console.log(`\nLatest block: ${latestBlock}`);
  console.log(`Searching ${latestBlock - searchFrom} blocks (${searchFrom} → ${latestBlock})\n`);

  // ── 1. Scan ResourceVault for LootTransferred ─────────────────────────────
  console.log("🔍 Scanning ResourceVault for LootTransferred events...");
  const lootLogs = await getLogs1000(RESOURCE_VAULT, LOOT_TRANSFERRED_ABI, searchFrom, latestBlock);

  if (lootLogs.length > 0) {
    console.log(`\n✅ Found ${lootLogs.length} LootTransferred event(s):\n`);
    printLootLogs(lootLogs);
    return;
  }
  console.log("   ⚠️  No LootTransferred events found.\n");

  // ── 2. Scan PvPArena for ANY transactions (via block scanning) ────────────
  console.log("🔍 Scanning PvPArena contract for recent transactions (last 100 blocks)...");
  const recentFrom = latestBlock - 100n;
  let found = 0;

  for (let b = latestBlock; b >= recentFrom; b--) {
    const block = await client.getBlock({ blockNumber: b, includeTransactions: true });
    const arenasTxs = block.transactions.filter(
      tx => tx.to && tx.to.toLowerCase() === PVP_ARENA.toLowerCase()
    );
    if (arenasTxs.length > 0) {
      for (const tx of arenasTxs) {
        found++;
        console.log(`\n📦 Block ${b} — PvPArena tx found:`);
        console.log(`   TxHash:   ${tx.hash}`);
        console.log(`   From:     ${tx.from}`);
        console.log(`   Input:    ${tx.input.slice(0, 10)} (selector)`);

        const receipt = await client.getTransactionReceipt({ hash: tx.hash });
        console.log(`   Status:   ${receipt.status}`);
        console.log(`   Logs (${receipt.logs.length}):`);
        for (const log of receipt.logs) {
          console.log(`     Contract: ${log.address}`);
          console.log(`     Topics:   ${log.topics.join(", ")}`);
          console.log(`     Data:     ${log.data}`);

          // Try to decode as LootTransferred
          if (log.address.toLowerCase() === RESOURCE_VAULT.toLowerCase()) {
            try {
              const decoded = decodeLog(log);
              if (decoded) {
                console.log("\n✅  ═══ LOOT TRANSFER DECODED ═══");
                console.log(`     Attacker:       ${decoded.attacker}`);
                console.log(`     Defender:       ${decoded.defender}`);
                console.log(`     Credits Looted: ${decoded.creditsLooted}`);
                console.log(`     Biomass Looted: ${decoded.biomassLooted}`);
                console.log(`     Minera Looted:  ${decoded.mineraLooted}`);
                console.log(`     Battle ID:      ${decoded.battleId}`);
                console.log("     ═══════════════════════════\n");
              }
            } catch (_) {}
          }
          console.log();
        }
      }
    }
    if (found >= 5) break; // Stop after finding 5 transactions
  }

  if (found === 0) {
    console.log("\n❌ No PvPArena transactions found in the last 100 blocks.");
    console.log("   → No raids have been submitted recently.\n");
    console.log("   To test: trigger an interceptRaid from the UI, then re-run this script.\n");
  }
}

// Manual decode of LootTransferred from raw log
// LootTransferred(address indexed attacker, address indexed defender, uint64 creditsLooted, uint64 biomassLooted, uint64 mineraLooted, uint256 indexed battleId)
function decodeLog(log) {
  // topic[0] = event sig, topic[1] = attacker (indexed), topic[2] = defender (indexed), topic[3] = battleId (indexed)
  if (log.topics.length < 4) return null;

  const attacker = "0x" + log.topics[1].slice(26);
  const defender = "0x" + log.topics[2].slice(26);
  const battleId = BigInt(log.topics[3]);

  // data = abi-encoded (uint64, uint64, uint64) → 3 × 32 bytes
  const data = log.data.slice(2); // strip 0x
  const creditsLooted = BigInt("0x" + data.slice(0, 64));
  const biomassLooted = BigInt("0x" + data.slice(64, 128));
  const mineraLooted  = BigInt("0x" + data.slice(128, 192));

  return { attacker, defender, creditsLooted, biomassLooted, mineraLooted, battleId };
}

function printLootLogs(logs) {
  for (const log of logs) {
    const { attacker, defender, creditsLooted, biomassLooted, mineraLooted, battleId } = log.args;
    console.log("═".repeat(70));
    console.log(`Block:          ${log.blockNumber}`);
    console.log(`TxHash:         ${log.transactionHash}`);
    console.log("─".repeat(70));
    console.log(`Attacker:       ${attacker}`);
    console.log(`Defender:       ${defender}`);
    console.log(`Credits Looted: ${creditsLooted}`);
    console.log(`Biomass Looted: ${biomassLooted}`);
    console.log(`Minera Looted:  ${mineraLooted}`);
    console.log(`Battle ID:      ${battleId}`);
    console.log("═".repeat(70) + "\n");
  }
}

main().catch(console.error);
